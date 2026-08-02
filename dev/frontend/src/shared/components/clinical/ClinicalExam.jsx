// src/components/ClinicalExam.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "@/config";

// Utility: format teeth list professionally
const formatTeethPhrase = (teeth = []) => {
  const list = (teeth || []).filter(Boolean).map(String);
  if (!list.length) return "";

  // If a whole segment is selected, describe the segment instead of listing all teeth
  const sorted = [...list].sort();
  const asSet = new Set(sorted);
  const matches = (expected) =>
    expected.length === sorted.length &&
    expected.every((t) => asSet.has(String(t)));
  const containsAll = (expected) => expected.every((t) => asSet.has(String(t)));

  const segments = [
    // Adult quadrants
    { teeth: ["11","12","13","14","15","16","17","18"], label: "upper left quadrant" },
    { teeth: ["21","22","23","24","25","26","27","28"], label: "upper right quadrant" },
    { teeth: ["31","32","33","34","35","36","37","38"], label: "lower left quadrant" },
    { teeth: ["41","42","43","44","45","46","47","48"], label: "lower right quadrant" },
    // Full mouth adult
    {
      teeth: ["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28","31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48"],
      label: "full mouth",
    },
    // Primary quadrants
    { teeth: ["51","52","53","54","55"], label: "upper left quadrant (primary)" },
    { teeth: ["61","62","63","64","65"], label: "upper right quadrant (primary)" },
    { teeth: ["71","72","73","74","75"], label: "lower left quadrant (primary)" },
    { teeth: ["81","82","83","84","85"], label: "lower right quadrant (primary)" },
    // Full mouth primary
    {
      teeth: ["51","52","53","54","55","61","62","63","64","65","71","72","73","74","75","81","82","83","84","85"],
      label: "full mouth (primary)",
    },
  ];

  // Exact single segment match
  const seg = segments.find((s) => matches(s.teeth));
  if (seg) return seg.label;

  // Try to cover selection with segment + remaining teeth
  const coverage = [];
  let remaining = new Set(sorted);
  segments.forEach((s) => {
    if (s.teeth.every((t) => remaining.has(String(t)))) {
      coverage.push(s.label);
      s.teeth.forEach((t) => remaining.delete(String(t)));
    }
  });

  const remainingList = Array.from(remaining);
  const parts = [];
  if (coverage.length) parts.push(...coverage);
  if (remainingList.length === 1) parts.push(`tooth ${remainingList[0]}`);
  else if (remainingList.length === 2)
    parts.push(`teeth ${remainingList[0]} and ${remainingList[1]}`);
  else if (remainingList.length > 2) {
    const last = remainingList.pop();
    parts.push(`teeth ${remainingList.join(", ")} and ${last}`);
  }

  if (parts.length === 1) return parts[0];
  if (parts.length > 1) {
    const last = parts.pop();
    return `${parts.join(", ")} and ${last}`;
  }

  if (list.length === 1) return `tooth ${list[0]}`;
  if (list.length === 2) return `teeth ${list[0]} and ${list[1]}`;
  const last = list[list.length - 1];
  return `teeth ${list.slice(0, -1).join(", ")} and ${last}`;
};

const arraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i]) !== String(b[i])) return false;
  }
  return true;
};

// Compose deterministic professional sentence (teeth are not appended automatically)
const composeExamSentence = ({
  defaultText = "",
  customText = "",
  fallback = "",
}) => {
  const custom = (customText || "").trim();
  if (custom) return custom; // keep exactly what doctor typed
  const base = (fallback || defaultText || "No significant findings noted").trim();
  return base;
};

export default function ClinicalExam({
  visitId,
  value = [],
  onChange,
  selectedTeeth = [],
  onSelectedTeethChange,
  odontogramMode = "adult",
  onOdoModeChange,
  ensureVisitId, // optional async creator (returns visitId)
}) {
  const [examItems, setExamItems] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [customNotes, setCustomNotes] = useState({}); // itemKey -> custom phrase typed by doctor
  const [savedSentences, setSavedSentences] = useState({}); // itemKey -> last saved composed sentence
  const [editing, setEditing] = useState({}); // itemKey -> bool
  const valueByKeyRef = useRef({}); // saved visit data by itemKey
  const lastPushedRef = useRef({}); // avoid push loops to parent

  // When visit changes, reset internal state
  useEffect(() => {
    setActiveKey(null);
    setCustomNotes({});
    setSavedSentences({});
    setEditing({});
    valueByKeyRef.current = {};
    lastPushedRef.current = {};
  }, [visitId]);

  // Load master exam items from backend (/api/exam-items)
  useEffect(() => {
    const loadExamItems = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exam-items`);
        if (!res.ok) {
          console.error("Failed to load exam items master");
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        list.sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
        setExamItems(list);
      } catch (e) {
        console.error("Error loading exam items master", e);
      }
    };
    loadExamItems();
  }, []);

  // Build valueByKey and hydrate saved/custom notes
  useEffect(() => {
    const map = {};
    (value || []).forEach((it) => {
      const key =
        it.itemKey || it.key || it.examItemKey || it.item_key;
      if (!key) return;
      map[key] = it;
    });
    valueByKeyRef.current = map;

    setSavedSentences((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(map).forEach(([key, it]) => {
        const val = it.text ?? it.description ?? "";
        if (next[key] !== val) {
          next[key] = val;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setEditing((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(map).forEach(([key, it]) => {
        const val = it.text ?? it.description ?? "";
        const persisted = !!(
          it.id ||
          it.examItemId ||
          it.visitExamItemId ||
          it.exam_item_id
        );
        if (persisted && val && next[key] !== false) {
          next[key] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setCustomNotes((prev) => {
      let changed = false;
      const next = { ...prev };
      examItems.forEach((m) => {
        const k = m.itemKey;
        if (!k) return;
        const savedText =
          map[k]?.text ?? map[k]?.description;
        if (savedText !== undefined && savedText !== next[k]) {
          next[k] = savedText;
          changed = true;
        } else if (next[k] === undefined) {
          next[k] = "";
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [value, examItems]);

  const findMeta = (key) =>
    examItems.find((x) => x.itemKey === key) || null;

  const isPersistedKey = (key) => {
    const it = valueByKeyRef.current[key];
    return !!(
      it?.id ||
      it?.examItemId ||
      it?.visitExamItemId ||
      it?.exam_item_id
    );
  };

  const getTeethFromItem = (item) =>
    item?.selectedTeeth ||
    item?.selected_teeth ||
    item?.teeth ||
    item?.teethSelected ||
    [];

  const buildPreview = (key, opts = {}) => {
    const meta = findMeta(key);
    const existing = valueByKeyRef.current[key];
    const teethForKey =
      activeKey === key
        ? selectedTeeth
        : getTeethFromItem(existing);

    const baseCustom = opts.customText ?? customNotes[key] ?? "";
    const savedText = savedSentences[key] ?? existing?.text ?? "";

    const preview = composeExamSentence({
      defaultText: meta?.defaultText ?? "",
      customText: baseCustom,
      fallback: savedText,
    });

    return { preview, teethForKey, defaultText: meta?.defaultText ?? "" };
  };

  const pushToParent = (key, opts = {}) => {
    if (!onChange || !key) return;
    const meta = findMeta(key);
    const existing = valueByKeyRef.current[key];

    const title = meta?.title || existing?.title || key;

    const { preview, teethForKey } = buildPreview(key, opts);

    const payload = {
      key,
      title,
      text: preview,
      odontogramMode,
      selectedTeeth: [...teethForKey],
    };

    const last = lastPushedRef.current[key];
    const sameTeeth =
      last &&
      last.selectedTeeth.length === payload.selectedTeeth.length &&
      last.selectedTeeth.every((t, i) => t === payload.selectedTeeth[i]);

    if (
      last &&
      last.text === payload.text &&
      last.odontogramMode === payload.odontogramMode &&
      sameTeeth
    ) {
      return; // no change, avoid update loop
    }

    lastPushedRef.current = {
      ...lastPushedRef.current,
      [key]: payload,
    };

    onChange([payload]);
  };

  const handleTabClick = (itemKey) => {
    if (activeKey === itemKey) {
      // collapse current section
      setActiveKey(null);
      onChange && onChange([]);
      return;
    }

    setActiveKey(itemKey);

    const existing = valueByKeyRef.current[itemKey];

    // When switching tab: sync saved odontogram for that exam (if present)
    const existingTeeth = getTeethFromItem(existing);
    if (existing && Array.isArray(existingTeeth)) {
      const savedMode = existing.odontogramMode || "adult";
      const savedTeeth = existingTeeth || [];

      if (onOdoModeChange && savedMode !== odontogramMode) {
        onOdoModeChange(savedMode);
      }
      if (onSelectedTeethChange) {
        onSelectedTeethChange([...savedTeeth]);
      }
    } else {
      // new section: clear teeth, keep mode
      onSelectedTeethChange && onSelectedTeethChange([]);
    }
  };

  // First load: auto-open either saved exam or first master item
  useEffect(() => {
    if (activeKey) return;
    const map = valueByKeyRef.current;
    const savedKeys = Object.keys(map);

    let defaultKey = null;
    if (savedKeys.length) {
      defaultKey = savedKeys[0]; // first saved exam item
    } else if (examItems.length) {
      defaultKey = examItems[0].itemKey; // first master
    }

    if (!defaultKey) return;
    handleTabClick(defaultKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examItems, value, activeKey, visitId]);

  const handleTextChange = (key, text) => {
    setCustomNotes((prev) => ({ ...prev, [key]: text }));
    if (activeKey === key) {
      pushToParent(key, { customText: text });
    }
  };

  const handleSave = async (key) => {
    if (!key) return;

    let targetVisitId = visitId;
    if (!targetVisitId && typeof ensureVisitId === "function") {
      try {
        targetVisitId = await ensureVisitId();
      } catch (e) {
        console.error("Failed to ensure visit", e);
      }
    }
    if (!targetVisitId) {
      alert("Please select a visit before saving.");
      return;
    }

    const meta = findMeta(key);
    const customText = (customNotes[key] || "").trim();
    const defaultText = (meta?.defaultText || "No significant findings noted.").trim();
    const finalTextForSave = customText || defaultText;

    const { preview } = buildPreview(key, {
      customText: finalTextForSave,
    });

    const payload = {
      visitId: Number(targetVisitId),
      itemKey: key,
      text: finalTextForSave,
      odontogramMode: odontogramMode,
      selectedTeeth: selectedTeeth || [],
    };

    fetch(`${API_BASE}/api/visits/${targetVisitId}/exam-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save exam item");
        return res.json();
      })
      .then((saved) => {
        // sync parent with saved text and remember for preview
          onChange &&
          onChange([
            {
              key: saved.itemKey,
              title: saved.title,
              text: finalTextForSave,
              odontogramMode,
              selectedTeeth: [...(selectedTeeth || [])],
            },
          ]);
        setSavedSentences((prev) => ({
          ...prev,
          [key]: finalTextForSave,
        }));
        
        // Update valueByKeyRef with the saved ID so isPersistedKey works correctly
        valueByKeyRef.current = {
          ...valueByKeyRef.current,
          [key]: {
            ...(valueByKeyRef.current[key] || {}),
            id: saved.id || saved.visitExamItemId,
            visitExamItemId: saved.id || saved.visitExamItemId,
            text: finalTextForSave,
            selectedTeeth: [...(selectedTeeth || [])],
            odontogramMode,
          },
        };

        // mark this tab as non-editing (doctor can click Edit again)
        setEditing((prev) => ({ ...prev, [key]: false }));
        alert(`Saved: ${saved.title || key}`);
      })
      .catch((err) => {
        console.error(err);
        alert("Error saving this examination part.");
      });
  };

  const handleEdit = (key) => {
    setEditing((prev) => ({ ...prev, [key]: true }));
  };

  const activeItem = useMemo(() => {
    if (!activeKey) return null;
    return findMeta(activeKey);
  }, [activeKey, examItems]);

  const currentText = useMemo(() => {
    if (!activeItem) return "";
    const key = activeItem.itemKey;
    const note = customNotes[key];
    if (typeof note === "string") return note;
    const existing = valueByKeyRef.current[key];
    return existing?.text ?? existing?.description ?? "";
  }, [activeItem, customNotes]);

  const currentDefault = activeItem?.defaultText || "No significant findings noted.";
  const selectedLabel = useMemo(() => {
    if (!activeItem) return "";
    return formatTeethPhrase(selectedTeeth);
  }, [activeItem, selectedTeeth]);

  const isEditing =
    activeItem &&
    (editing[activeItem.itemKey] === undefined
      ? true
      : editing[activeItem.itemKey]);

  return (
    <>
      {/* BUTTON GRID */}
      <div className="exam-grid">
        {examItems.map((it, idx) => (
          <button
            key={it.itemKey}
            type="button"
            className={
              "btn exam-btn" +
              (activeKey === it.itemKey ? " active" : "")
            }
            onClick={() => handleTabClick(it.itemKey)}
          >
            {idx + 1}. {it.title}
          </button>
        ))}
      </div>

      {/* DETAIL PANEL */}
      {activeItem && (
        <div className="exam-notes">
          <div className="exam-card">
          <div className="exam-card-head section-head">
            <strong>{activeItem.title}</strong>
            </div>

            <div className="pill" style={{ marginBottom: 8 }}>
              Default: {currentDefault}
            </div>

            <textarea
              id={`exam-box-${activeItem.itemKey}`}
              className="exam-text"
              rows={3}
              value={currentText}
              onChange={(e) =>
                handleTextChange(activeItem.itemKey, e.target.value)
              }
              disabled={!isEditing}
              placeholder="Write a short clinical phrase (e.g., deep caries)"
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
              {!isEditing && isPersistedKey(activeItem.itemKey) && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => handleEdit(activeItem.itemKey)}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="btn sm primary"
                onClick={() => handleSave(activeItem.itemKey)}
                disabled={!isEditing}
              >
                Save
              </button>
            </div>

            {selectedLabel && (
              <div
                className="selected-teeth"
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#2f3b52",
                  background: "#f3f6ff",
                  padding: "6px 10px",
                  borderRadius: 8,
                  display: "inline-block",
                }}
              >
                Involving Teeth: {selectedLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

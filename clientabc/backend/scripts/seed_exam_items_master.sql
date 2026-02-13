-- Seed exam_items_master for clinical exam templates
-- Uses item_key as natural key for upsert

INSERT INTO exam_items_master (
    id,
    created_at,
    default_text,
    display_order,
    is_active,
    item_key,
    title,
    updated_at
) VALUES
    (1, '2025-12-06 22:46:49.744405', 'All teeth are free from carious lesions. No visible discoloration, cavitation, or soft spots detected.', 1, true, 'caries', 'Dental Caries Examination', '2025-12-06 22:46:49.744405'),
    (2, '2025-12-06 22:46:49.744405', 'Gingiva is pink, firm, and stippled with no bleeding or swelling. Margins are well contoured.', 2, true, 'gingiva', 'Gingival Examination', '2025-12-06 22:46:49.744405'),
    (3, '2025-12-06 22:46:49.744405', 'Minimal plaque present; no visible calculus or deposits on tooth surfaces. Oral hygiene appears satisfactory.', 3, true, 'plaque', 'Plaque and Calculus Assessment', '2025-12-06 22:46:49.744405'),
    (4, '2025-12-06 22:46:49.744405', 'All teeth are firm with no abnormal mobility detected on palpation.', 4, true, 'mobility', 'Tooth Mobility Test', '2025-12-06 22:46:49.744405'),
    (5, '2025-12-06 22:46:49.744405', 'Normal Class I occlusion. No crossbite, open bite, or crowding observed. Midlines are coincident.', 5, true, 'occlusion', 'Occlusion and Alignment Check', '2025-12-06 22:46:49.744405'),
    (6, '2025-12-06 22:46:49.744405', 'All tested teeth respond normally to thermal and electric pulp tests. No delayed or absent responses.', 6, true, 'vitality', 'Tooth Vitality Test', '2025-12-06 22:46:49.744405'),
    (7, '2025-12-06 22:46:49.744405', 'Smooth opening and closing of mouth. No clicking, deviation, or tenderness on palpation.', 7, true, 'tmj', 'Temporomandibular Joint (TMJ) Examination', '2025-12-06 22:46:49.744405'),
    (8, '2025-12-06 22:46:49.744405', 'Mucosa appears pink, moist, and intact with no ulcers, lesions, or white/red patches.', 8, true, 'mucosa', 'Oral Mucosa Examination', '2025-12-06 22:46:49.744405'),
    (9, '2025-12-06 22:46:49.744405', 'Tongue is moist, well-papillated, and freely movable. No coating, fissures, or lesions noted.', 9, true, 'tongue', 'Tongue Examination', '2025-12-06 22:46:49.744405'),
    (10, '2025-12-06 22:46:49.744405', 'Probing depth within normal limits (1-3 mm). No bleeding on probing or attachment loss observed.', 10, true, 'pockets', 'Periodontal Pocket Measurement', '2025-12-06 22:46:49.744405'),
    (11, '2025-12-06 22:46:49.744405', 'Radiographs show healthy bone levels and intact lamina dura. No evidence of decay or periapical pathology.', 11, true, 'radiograph', 'Radiographic Examination', '2025-12-06 22:46:49.744405'),
    (12, '2025-12-06 22:46:49.744405', 'Tooth surfaces are smooth with no pathological wear facets, cervical abrasion, or erosion signs.', 12, true, 'wear', 'Attrition, Abrasion and Erosion Check', '2025-12-06 22:46:49.744405'),
    (13, '2025-12-06 22:46:49.744405', 'Existing restorations (if any) are intact, well contoured, and free from marginal leakage.', 13, true, 'restorations', 'Restoration and Filling Evaluation', '2025-12-06 22:46:49.744405'),
    (14, '2025-12-06 22:46:49.744405', 'Teeth appear clean and naturally shaded. No extrinsic or intrinsic stains observed.', 14, true, 'stains', 'Discoloration and Stain Assessment', '2025-12-06 22:46:49.744405'),
    (15, '2025-12-06 22:46:49.744405', 'Saliva is clear and adequate in quantity. Duct openings are patent with normal flow on palpation.', 15, true, 'saliva', 'Salivary Gland and Flow Assessment', '2025-12-06 22:46:49.744405'),
    (16, '2025-12-06 22:46:49.744405', '', 16, true, 'other', 'Other (Specify)', '2025-12-06 22:46:49.744405')
ON CONFLICT (item_key) DO UPDATE SET
    title = EXCLUDED.title,
    default_text = EXCLUDED.default_text,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

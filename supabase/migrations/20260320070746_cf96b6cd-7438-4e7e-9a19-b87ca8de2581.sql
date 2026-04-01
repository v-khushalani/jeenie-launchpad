INSERT INTO batches (name, exam_type, grade, is_active, is_free, description)
VALUES
  ('Foundation Class 6', 'Foundation', 6, true, true, 'NCERT Science Class 6'),
  ('Foundation Class 7', 'Foundation', 7, true, true, 'NCERT Science Class 7'),
  ('Foundation Class 8', 'Foundation', 8, true, true, 'NCERT Science Class 8'),
  ('Foundation Class 9', 'Foundation', 9, true, true, 'NCERT Science Class 9'),
  ('Foundation Class 10', 'Foundation', 10, true, true, 'NCERT Science Class 10')
ON CONFLICT DO NOTHING;
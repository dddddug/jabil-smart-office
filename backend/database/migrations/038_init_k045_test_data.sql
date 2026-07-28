-- Migration: 038_init_k045_test_data
-- Description: Initialize test data for jso_k045_document table
-- Date: 2024-07-28

-- Insert test documents with different statuses
INSERT INTO jso_k045_document (document_no, wc_name, delivery_location, submitter_name, status, submitted_at, is_urgent, is_rush) VALUES
('K045-2024-001', 'W/C-A01', 'A栋1楼', '张三', 'completed', NOW() - INTERVAL '5 days', FALSE, FALSE),
('K045-2024-002', 'W/C-B02', 'B栋2楼', '李四', 'signed', NOW() - INTERVAL '3 days', TRUE, FALSE),
('K045-2024-003', 'W/C-C03', 'C栋3楼', '王五', 'received', NOW() - INTERVAL '1 day', FALSE, TRUE),
('K045-2024-004', 'W/C-D04', 'D栋4楼', '赵六', 'submitted', NOW() - INTERVAL '2 hours', FALSE, FALSE),
('K045-2024-005', 'W/C-E05', 'E栋5楼', '张三', 'returned', NOW() - INTERVAL '1 day', TRUE, FALSE)
ON CONFLICT (document_no) DO NOTHING;

-- Insert additional test documents
INSERT INTO jso_k045_document (document_no, wc_name, delivery_location, submitter_name, status, submitted_at, is_urgent, is_rush) VALUES
('K045-2024-006', 'W/C-F06', 'F栋6楼', '李四', 'submitted', NOW() - INTERVAL '6 hours', FALSE, FALSE),
('K045-2024-007', 'W/C-G07', 'G栋7楼', '王五', 'completed', NOW() - INTERVAL '7 days', TRUE, TRUE),
('K045-2024-008', 'W/C-H08', 'H栋8楼', '赵六', 'distribution_ended', NOW() - INTERVAL '1 day', FALSE, FALSE)
ON CONFLICT (document_no) DO NOTHING;

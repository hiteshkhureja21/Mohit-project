-- ==============================================================================
-- SourceFlow Supabase Storage Bucket Setup
-- Configures the private 'sourceflow-files' bucket
-- ==============================================================================

-- 1. Create or configure private storage bucket 'sourceflow-files'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'sourceflow-files',
    'sourceflow-files',
    false,
    26214400, -- 25MB in bytes (25 * 1024 * 1024)
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg'
    ];

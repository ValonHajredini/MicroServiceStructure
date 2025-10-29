# Epic 3: Notes Service

**Epic Goal:** Deliver complete note-taking microservice with CRUD operations, rich text editing, file attachments via DigitalOcean Spaces, folder organization, full-text search, and responsive Angular UI. First business service demonstrating proven microservices patterns from Epics 1-2.

## Story 3.1: Notes Service - Database Schema & Setup

**As a** developer,
**I want** notes_db database with proper schema and tenant isolation,
**so that** we have secure data foundation for Notes Service.

**Acceptance Criteria:**
1. PostgreSQL notes_db database created with TypeORM connection configured
2. Notes entity: id (UUID), tenant_id, user_id, title, content, folder_id, is_pinned, deleted_at, created_at, updated_at
3. Folders entity: id (UUID), tenant_id, user_id, name, parent_id (self-reference), created_at
4. Note_attachments entity: id (UUID), tenant_id, note_id, file_id (references Core Service files table)
5. All entities have tenant_id with global scope configured
6. Database migrations created and tested
7. Seed data script creates sample notes for local testing

## Story 3.2: Notes API - CRUD Operations

**As a** user,
**I want** to create, read, update, and delete notes,
**so that** I can capture and manage my information.

**Acceptance Criteria:**
1. POST /notes endpoint creates note with title, content, folder_id (optional)
2. Note automatically scoped to tenant from JWT, user_id from token
3. GET /notes endpoint returns paginated note list filtered by tenant_id
4. GET /notes/:id endpoint returns single note with attachments
5. PATCH /notes/:id endpoint updates title, content, folder_id, is_pinned
6. DELETE /notes/:id soft deletes note (sets deleted_at timestamp)
7. Only note owner or tenant admin can update/delete notes

## Story 3.3: Notes API - Folder Management

**As a** user,
**I want** to organize notes into folders,
**so that** I can structure my content logically.

**Acceptance Criteria:**
1. POST /folders endpoint creates folder with name and optional parent_id
2. GET /folders endpoint returns tenant's folder tree structure
3. PATCH /folders/:id endpoint updates folder name or parent_id
4. DELETE /folders/:id moves notes to root (folder_id = null) and deletes folder
5. Folders support single-level nesting (parent-child, no deeper)
6. GET /notes?folder_id=xyz endpoint filters notes by folder
7. Folder ownership follows same rules as notes (owner or admin)

## Story 3.4: Notes API - File Attachments

**As a** user,
**I want** to attach files to notes,
**so that** I can keep related documents together.

**Acceptance Criteria:**
1. POST /notes/:id/attachments endpoint accepts file_id from Core File Service
2. Creates note_attachments record linking note to file
3. GET /notes/:id includes attachments array with file metadata
4. DELETE /notes/:id/attachments/:attachmentId removes attachment from note
5. Attachment size limit enforced: 25MB per file, 100MB total per note
6. Deleting note cascades soft-delete to attachments (deleted_at set)
7. Authorization: Only note owner/admin can manage attachments

## Story 3.5: Notes API - Full-Text Search

**As a** user,
**I want** to search notes by title and content,
**so that** I can quickly find information.

**Acceptance Criteria:**
1. GET /notes/search?q=query endpoint searches title and content fields
2. Uses PostgreSQL full-text search (to_tsvector/to_tsquery)
3. Results ranked by relevance, paginated (20 per page)
4. Search scoped to tenant_id automatically
5. Supports multi-word queries with AND logic
6. Deleted notes excluded from search results
7. Response includes matching snippets with highlighted query terms

## Story 3.6: Notes UI - Note List & Editor

**As a** user,
**I want** an Angular app to view and edit notes,
**so that** I have a user-friendly interface.

**Acceptance Criteria:**
1. Angular app at notes.mydomain.com with sidebar folder tree navigation
2. Note list view shows: title, preview (first 100 chars), last modified date, pin icon
3. Clicking note opens editor in main panel
4. Rich text editor (PrimeNG Editor or Quill.js) supports: bold, italic, lists, links
5. Auto-save triggers every 30 seconds if content changed
6. Editor includes attachment section showing uploaded files with download links
7. Responsive layout: sidebar collapses to hamburger menu on mobile

## Story 3.7: Notes UI - Search, Filters & Actions

**As a** user,
**I want** to search, filter, and perform actions on notes,
**so that** I can efficiently manage my content.

**Acceptance Criteria:**
1. Search bar in header calls /notes/search and displays results inline
2. Filter options: All Notes, Pinned, By Folder (dropdown)
3. Toolbar includes: New Note, New Folder, Pin/Unpin, Delete buttons
4. Delete confirmation dialog: "Move to trash?" with Confirm/Cancel
5. Pin/unpin toggles is_pinned flag and moves note to top of list
6. Empty states: "No notes yet" with "Create your first note" CTA
7. Loading states and error handling for all API calls

## Story 3.8: Notes UI - File Upload Integration

**As a** user,
**I want** to upload files to notes via drag-and-drop or file picker,
**so that** I can attach documents easily.

**Acceptance Criteria:**
1. Attachment section includes "Add file" button opening file picker
2. Drag-and-drop zone accepts files dropped onto editor
3. Client calls Core Service POST /files/presigned-url to get upload URL
4. File uploaded directly to DigitalOcean Spaces using presigned URL
5. After upload, client calls POST /notes/:id/attachments with file_id
6. Upload progress indicator shows percentage complete
7. File size validation: 25MB max per file, error message if exceeded

---

# Epic 4: Kanban Service

**Epic Goal:** Implement task management microservice with board/column/task hierarchy, drag-and-drop workflows, team collaboration features (assignments, comments), real-time board updates, and responsive Angular UI. Demonstrates more complex microservices patterns with real-time collaboration.

## Story 4.1: Kanban Service - Database Schema & Setup

**As a** developer,
**I want** kanban_db database with proper schema supporting boards, columns, and tasks,
**so that** we have flexible task management foundation.

**Acceptance Criteria:**
1. PostgreSQL kanban_db database created with TypeORM connection configured
2. Boards entity: id (UUID), tenant_id, owner_id, name, description, created_at, updated_at
3. Columns entity: id (UUID), tenant_id, board_id, title, position (integer), wip_limit (optional), created_at
4. Tasks entity: id (UUID), tenant_id, column_id, board_id (denormalized), title, description, assigned_to, priority (high/medium/low), due_date, position, created_at, updated_at
5. Task_comments entity: id (UUID), tenant_id, task_id, user_id, content, created_at
6. All entities have tenant_id with global scope configured
7. Database migrations and seed data for local testing

## Story 4.2: Kanban API - Board Management

**As a** user,
**I want** to create and manage Kanban boards,
**so that** I can organize different projects or workflows.

**Acceptance Criteria:**
1. POST /boards endpoint creates board with name, description, owner_id (from JWT)
2. Board automatically scoped to tenant_id from JWT
3. GET /boards endpoint returns tenant's boards with pagination
4. GET /boards/:id endpoint returns board with columns and tasks
5. PATCH /boards/:id endpoint updates name and description
6. DELETE /boards/:id soft deletes board and cascades to columns/tasks
7. Authorization: Owner or tenant admin can modify/delete boards

## Story 4.3: Kanban API - Column Management

**As a** user,
**I want** to create and manage columns within boards,
**so that** I can define my workflow stages.

**Acceptance Criteria:**
1. POST /boards/:boardId/columns endpoint creates column with title, position
2. Columns ordered by position field (auto-incremented if not specified)
3. GET /boards/:id includes columns array sorted by position
4. PATCH /columns/:id endpoint updates title, position, wip_limit
5. DELETE /columns/:id moves tasks to first column then deletes column
6. Reordering columns updates position values maintaining sort order
7. WIP limit validation: Cannot move task to column exceeding limit (optional enforcement)

## Story 4.4: Kanban API - Task CRUD Operations

**As a** user,
**I want** to create and manage tasks within columns,
**so that** I can track work items.

**Acceptance Criteria:**
1. POST /columns/:columnId/tasks endpoint creates task with title, description, assigned_to, priority, due_date
2. Task automatically assigned tenant_id, board_id (from column), position (bottom of column)
3. GET /tasks/:id endpoint returns task with comments
4. PATCH /tasks/:id endpoint updates title, description, assigned_to, priority, due_date, column_id (for moves)
5. DELETE /tasks/:id soft deletes task
6. Moving task to different column updates column_id and position
7. Authorization: Anyone in tenant can create; owner/assignee/admin can update/delete

## Story 4.5: Kanban API - Task Comments & Activity

**As a** user,
**I want** to comment on tasks and see activity history,
**so that** I can collaborate with team members.

**Acceptance Criteria:**
1. POST /tasks/:taskId/comments endpoint creates comment with content, user_id (from JWT)
2. GET /tasks/:id/comments endpoint returns comments ordered by created_at
3. PATCH /comments/:id endpoint allows comment author to edit content
4. DELETE /comments/:id soft deletes comment (only author or admin)
5. Task activity log tracks: created, assigned, moved, completed (column-based)
6. GET /tasks/:id/activity endpoint returns activity timeline
7. Comments and activity scoped to tenant automatically

## Story 4.6: Kanban API - Real-Time Updates Strategy

**As a** developer,
**I want** to implement real-time board updates,
**so that** team members see changes within 5 seconds.

**Acceptance Criteria:**
1. Decision implemented: WebSocket, Server-Sent Events, or Polling (decided by Week 12)
2. If WebSocket: Socket.io or native WebSocket server configured
3. If Polling: GET /boards/:id/updates?since=timestamp endpoint returns changes
4. Board update events: task created/moved/updated, column added/reordered, comment added
5. Client receives updates and reflects changes without full page reload
6. Updates scoped to tenant and board (users only see their board's changes)
7. Fallback to polling if WebSocket connection fails

## Story 4.7: Kanban UI - Board List & Board View

**As a** user,
**I want** an Angular app to view my Kanban boards,
**so that** I can access my task management system.

**Acceptance Criteria:**
1. Angular app at kanban.mydomain.com with board list view
2. Board list shows: name, description, last updated, number of tasks
3. "Create New Board" button opens creation modal
4. Clicking board navigates to /boards/:id with full board view
5. Board view displays columns horizontally with tasks as cards
6. Empty board state: "Add your first column" CTA
7. Responsive: Columns stack vertically on mobile, horizontal scroll on tablet

## Story 4.8: Kanban UI - Drag-and-Drop Workflow

**As a** user,
**I want** to drag-and-drop tasks between columns,
**so that** I can update task status intuitively.

**Acceptance Criteria:**
1. Tasks draggable within column to reorder position
2. Tasks draggable between columns to change status
3. Drag uses PrimeNG drag-drop or Angular CDK drag-drop
4. Drop triggers PATCH /tasks/:id updating column_id and position
5. Optimistic UI update: Card moves immediately, reverts on API error
6. Visual feedback: Drop zones highlight during drag, card shows "grabbing" cursor
7. Keyboard alternative: Arrow keys + Enter to move tasks (accessibility)

## Story 4.9: Kanban UI - Task Detail & Comments

**As a** user,
**I want** to view task details and add comments,
**so that** I can collaborate on work items.

**Acceptance Criteria:**
1. Clicking task card opens detail modal/sidebar
2. Task detail shows: title (editable inline), description, assignee dropdown, priority selector, due date picker
3. Comments section displays existing comments with author, timestamp
4. Comment input field with "Add comment" button
5. Activity timeline shows task history: created by X, moved to Y, assigned to Z
6. "Delete task" button in modal with confirmation
7. Modal closable via X button, Esc key, or clicking outside

## Story 4.10: Kanban UI - Real-Time Updates Integration

**As a** user,
**I want** to see board changes made by teammates in real-time,
**so that** I have current view of project status.

**Acceptance Criteria:**
1. Client establishes WebSocket connection (or polling interval) on board load
2. Incoming task create event adds card to appropriate column
3. Incoming task move event animates card to new column/position
4. Incoming comment event updates task comment count badge
5. Incoming column add/reorder event updates board layout
6. Visual indicator shows "X updated this board" toast notification
7. User's own actions don't trigger redundant update notifications

---

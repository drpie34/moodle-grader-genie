# Project Plantation: Comprehensive Codebase Map

## Core Architecture and Data Flow

### Application Architecture
- **Frontend**: React + TypeScript with Vite
- **UI Framework**: shadcn/ui components
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **State Management**: Context API + Custom Hooks
- **Routing**: React Router

### Data Flow
1. User authentication via AuthContext → Supabase Auth
2. Application data (projects, ideas, documents) fetched via custom hooks → Supabase client
3. AI operations flow: Frontend → API Gateway → AI Router → Specific AI services
4. Document generation: Frontend requests → Multiple storage mechanisms (DB + localStorage fallbacks)

## Key Components and Relationships

### Core Domain Objects
- **Projects**: Container for all project-related data
- **Ideas**: Concepts that can be developed into projects
- **Documents**: Auto-generated or user-uploaded content
- **Users**: Profiles with subscription tiers and credits

### Component Organization
1. **Feature-based components**:
   - IdeasHub: Idea generation, management, filtering
   - ProjectFormation: Creating structured projects from ideas
   - ContentGeneration: AI-assisted content creation
   - Collaboration: Sharing, comments, activities
   - VisualPlanning: Mind maps, Gantt charts

2. **Page components** (/src/pages/):
   - Serve as containers for feature components
   - Handle routing and top-level data fetching
   - Implement page-specific logic (e.g., document generation)

3. **UI Components** (/src/components/ui/):
   - Base UI elements (buttons, cards, dialogs)
   - Used throughout the application for consistency

4. **Specialized Components**:
   - EmbeddedPage: Renders pages without navigation elements
   - DocumentHub: Document management interface
   - AIModelIndicator: Shows active AI model

## Common Patterns

### Data Management
- **Custom hooks pattern**: Each domain has dedicated hooks (useIdeas, useProjects, etc.)
- **Fallback mechanisms**: Multiple storage approaches with graceful degradation
- **Service abstraction**: Document operations encapsulated in services

### UI Patterns
- **Card-based layouts**: Consistent presentation of ideas and projects
- **Tab systems**: Organize related content in sections
- **Responsive design**: Adapts to different screen sizes
- **Toast notifications**: User feedback for async operations

### Error Handling
- **Multi-layer approach**:
  - Try/catch at operation level
  - Retry mechanisms with exponential backoff
  - Service-level fallbacks
  - UI feedback via toast notifications

## Critical Interfaces

### Supabase Integration
- **Client initialization**: /src/integrations/supabase/client.ts
- **Database types**: /src/types/supabase.ts
- **Edge functions**: /supabase/functions/ (AI router, document analysis, etc.)

### Document System
- **Document service**: Manages CRUD operations for documents
- **Document generation service**: Creates structured documents from application data
- **Document Hub component**: UI for browsing, viewing, and managing documents

### AI Integration
- **API Gateway**: Central entry point for AI operations
- **AI Router**: Routes requests to appropriate AI services
- **AI-specific services**: Market research, project planning, document analysis

### Core Components Communication
- **Props passing**: Well-defined TypeScript interfaces
- **Context providers**: Auth, toast notifications
- **Custom events**: For specific inter-component communication
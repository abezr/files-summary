# TextDigest - C4 Architecture Diagrams

This directory contains C4 model diagrams for the TextDigest system using PlantUML format.

## 📐 C4 Model Overview

The C4 model provides a hierarchical way to visualize software architecture at different levels of detail:

1. **Level 1 - System Context**: The big picture (users, systems, interactions)
2. **Level 2 - Container**: High-level technology choices (apps, databases, services)
3. **Level 3 - Component**: Components within a container (modules, classes)
4. **Level 4 - Code**: Implementation details (classes, methods)

## 📊 Available Diagrams

### 1. Context Diagram (`01-context-diagram.puml`)
**Purpose**: Shows TextDigest in the context of users and external systems.

**Key Elements**:
- User (Developer/Analyst)
- TextDigest System
- Google Gemini API (Primary LLM)
- OpenAI API (Fallback LLM)
- File System (Local storage)

**Use this diagram to**:
- Explain the system to stakeholders
- Understand external dependencies
- See the system's scope and boundaries

### 2. Container Diagram (`02-container-diagram.puml`)
**Purpose**: Zooms into TextDigest to show containers (deployable units).

**Key Containers**:
- CLI Interface (Node.js/Commander)
- File Discovery (TypeScript)
- Content Processor (TypeScript)
- LLM Summarizer (TypeScript)
- Digest Builder (TypeScript)
- Quality Evaluator (TypeScript)
- Structured Logs (JSON)

**Use this diagram to**:
- Understand the high-level architecture
- See technology choices
- Plan deployment strategies

### 3. Component Diagram (`03-component-diagram.puml`)
**Purpose**: Zooms into the LLM Summarizer container to show components.

**Key Components**:
- `summarizeBatch()` - Main entry point
- `summarizeWithGoogle()` - Google Gemini integration
- `summarizeWithOpenAI()` - OpenAI integration
- `buildPrompt()` - Prompt engineering
- `calculateConfidence()` - Quality metrics
- Google/OpenAI SDK clients
- Logger

**Use this diagram to**:
- Understand internal structure
- See component responsibilities
- Plan code changes

### 4. Code Diagram (`04-code-diagram.puml`)
**Purpose**: Shows the core data structures and their relationships.

**Key Classes**:
- `FileMetadata` - Discovered file information
- `FileContent` - Extracted content
- `Batch<T>` - Grouped files for processing
- `FileSummary` - LLM-generated summary
- `Digest` - Final output structure
- `EvaluationResult` - Quality metrics

**Use this diagram to**:
- Understand data flow
- See type relationships
- Guide implementation

### 5. Sequence Diagram (`05-sequence-diagram.puml`)
**Purpose**: Shows the complete processing flow over time.

**Key Interactions**:
1. User executes CLI command
2. File discovery scans folder
3. Content extraction reads files
4. Batch creation groups files
5. Parallel LLM summarization
6. Digest generation
7. Quality evaluation
8. Output delivery

**Use this diagram to**:
- Understand execution flow
- Debug issues
- Optimize performance

### 6. Deployment Diagram (`06-deployment-diagram.puml`)
**Purpose**: Shows deployment options and infrastructure.

**Key Deployments**:
- **Docker Environment**: Containerized deployment
- **Local Environment**: Direct Node.js execution
- **File System**: Input/output volumes
- **Cloud APIs**: Google Gemini, OpenAI

**Use this diagram to**:
- Plan deployment
- Understand infrastructure
- Estimate costs

---

## 🛠️ Viewing the Diagrams

### Option 1: PlantUML Online Server
1. Visit: http://www.plantuml.com/plantuml/uml/
2. Copy diagram content
3. Paste and render

### Option 2: VS Code Extension
1. Install "PlantUML" extension
2. Open `.puml` file
3. Press `Alt+D` to preview

### Option 3: Local PlantUML
```bash
# Install PlantUML
brew install plantuml  # macOS
apt-get install plantuml  # Ubuntu

# Generate PNG
plantuml 01-context-diagram.puml

# Generate SVG
plantuml -tsvg 01-context-diagram.puml
```

### Option 4: Docker
```bash
# Generate all diagrams as PNG
docker run -v $(pwd):/data plantuml/plantuml:latest -tpng /data/*.puml

# Generate all diagrams as SVG
docker run -v $(pwd):/data plantuml/plantuml:latest -tsvg /data/*.puml
```

---

## 📝 Diagram Conventions

### Colors
- **Blue**: Internal components/containers
- **Gray**: External systems
- **Green**: Successful paths
- **Red**: Error/fallback paths

### Arrow Styles
- **Solid**: Direct communication
- **Dashed**: Indirect/async communication
- **Bold**: High-frequency interaction

### Notes
- 📌 **Top/Right**: Additional context
- 📌 **Bottom/Left**: Implementation details
- 📌 **Inline**: Critical information

---

## 🔄 Keeping Diagrams Updated

When making architectural changes:

1. **Identify Impact**: Which diagrams are affected?
2. **Update Diagrams**: Modify `.puml` files
3. **Regenerate Images**: Run PlantUML to create new images
4. **Version Control**: Commit changes with descriptive message
5. **Document Changes**: Update VERSION.md

### Example Workflow
```bash
# 1. Edit diagram
vim 02-container-diagram.puml

# 2. Regenerate
plantuml -tsvg 02-container-diagram.puml

# 3. Commit
git add docs/c4-diagrams/
git commit -m "docs: Update container diagram to reflect new batch size"
```

---

## 📚 References

- **C4 Model**: https://c4model.com/
- **PlantUML**: https://plantuml.com/
- **C4-PlantUML**: https://github.com/plantuml-stdlib/C4-PlantUML
- **TextDigest Docs**: ../architecture/

---

## 🎯 Quick Navigation

| Diagram | Level | File | Purpose |
|---------|-------|------|---------|
| Context | L1 | `01-context-diagram.puml` | System overview |
| Container | L2 | `02-container-diagram.puml` | Architecture components |
| Component | L3 | `03-component-diagram.puml` | Internal structure |
| Code | L4 | `04-code-diagram.puml` | Data flow |
| Sequence | - | `05-sequence-diagram.puml` | Execution flow |
| Deployment | - | `06-deployment-diagram.puml` | Infrastructure |

---

**Last Updated**: 2025-11-29  
**TextDigest Version**: 1.0.0

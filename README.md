# TAG Diary Website

A fullstack diary and personal history website built for documenting family stories, photos, audio recordings, and files.

## Features

- **Written Vignettes**: Create and edit text entries with embedded photos
- **Voice Recordings**: Record audio directly in the browser or upload audio files
- **Photo Gallery**: Upload and organize photos with chronological view
- **File Uploads**: Store miscellaneous files (odds and ends)
- **Multi-User Support**: Separate branches for different family members (e.g., separate section for grandmother)

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database management
- **SQLite**: Database (can be upgraded to PostgreSQL)
- **JWT**: Authentication
- **Python-multipart**: File upload handling

### Frontend
- **React**: UI framework
- **React Router**: Navigation
- **Axios**: HTTP client
- **Vite**: Build tool
- **Date-fns**: Date formatting

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file (optional, defaults will work):
```bash
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./tag_diary.db
```

5. Run the backend server:
```bash
python run.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. Start both the backend and frontend servers
2. Navigate to `http://localhost:3000`
3. Register a new account or login
4. Start creating vignettes, uploading photos, recording audio, and uploading files!

## Project Structure

```
GladneyFamilyTree/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application
│   │   ├── database.py      # Database configuration
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── auth.py          # Authentication logic
│   ├── requirements.txt     # Python dependencies
│   └── run.py               # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Vignettes
- `GET /api/vignettes` - Get all vignettes
- `POST /api/vignettes` - Create vignette
- `GET /api/vignettes/{id}` - Get specific vignette
- `PUT /api/vignettes/{id}` - Update vignette
- `DELETE /api/vignettes/{id}` - Delete vignette

### Photos
- `GET /api/photos` - Get all photos
- `POST /api/photos` - Upload photo
- `GET /api/photos/{id}` - Get photo file

### Audio Recordings
- `GET /api/audio` - Get all recordings
- `POST /api/audio` - Upload recording
- `GET /api/audio/{id}` - Get audio file

### Files
- `GET /api/files` - Get all files
- `POST /api/files` - Upload file
- `GET /api/files/{id}` - Download file

## Development Notes

- Photos and files are stored in the `backend/uploads/` directory
- The database is created automatically on first run
- Each user can only see their own content (multi-user support for separate branches)
- Audio recording uses the browser's MediaRecorder API
- Photos support chronological ordering and albums (albums feature partially implemented)

## Future Enhancements

- Complete album management UI
- People tagging in photos
- Word document import/export
- Advanced search functionality
- Photo metadata hiding (as per spec)
- Enhanced photo gallery features (more like Apple Photos)

## License

Private project for family use.

Started October 12th, 2025
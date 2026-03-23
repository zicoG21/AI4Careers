# main.jac - AI4Careers Backend
import from db { init_db }
import from auth { Signup, Login, Me, UpdatePreferences }
import from resume { ResumeUpload, GetResume, ListResumes, DeleteResume }
import from career_fair { ListEvents, ListCompanies, GetCompany, ListRoles, SaveCompany, UnsaveCompany, ListSavedCompanies, SavePitch }
import from ai_chat { ChatWithAI, GenerateElevatorPitch }
# Note: Walkers are automatically exposed as REST API endpoints at /walker/WalkerName
# Example endpoints:
# POST http://localhost:8000/walker/Signup  { "email": "...", "password": "...", "name": "..." }
# POST http://localhost:8000/walker/Login { "email": "...", "password": "..." }
# POST http://localhost:8000/walker/Me { "token": "..." }
# POST http://localhost:8000/walker/UpdatePreferences { "token": "...", ... }
# POST http://localhost:8000/walker/ResumeUpload { "token": "...", "filename": "...", "raw_text": "..." }
# POST http://localhost:8000/walker/ListEvents {}
# POST http://localhost:8000/walker/ListCompanies { "event_id": "..." }

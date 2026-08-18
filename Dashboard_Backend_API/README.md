# Dashboard Backend API

Backend APIs for AI Healthcare Communication Assistant.

## Technologies

- Python 3.11
- FastAPI
- SQLAlchemy
- SQLite
- Uvicorn

## Project Structure

```
Dashboard_Backend_API/
│
├── app/
│   ├── database/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── seed.py
│
├── dashboard.db
├── main.py
├── requirements.txt
└── README.md
```

## Installation

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload
```

## Swagger Documentation

```
http://127.0.0.1:8000/docs
```

## APIs

### User

GET

```
/api/dashboard/user
```

### Recent Prescriptions

GET

```
/api/dashboard/recent-prescriptions
```

### Notifications

GET

```
/api/dashboard/notifications
```

### Health Tip

GET

```
/api/dashboard/health-tip
```

## Database

SQLite

```
dashboard.db
```
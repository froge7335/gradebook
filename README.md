## About + Features
- Web-based gradebook application for grade tracking and management
- Secure user authentication via bcrypt and SQL injection prevention via parameterized statements
- Smooth and responsive frontend UI/UX
- Animated donut charts displaying current grade in each course
- Drag-and-drop reordering for courses and assignments
- Persistent storage via MySQL

## Requirements
- Node.js 22+
- npm 10+
- MySQL 

## Setup
1. Copy `.env.example` to `.env` and fill in your MySQL credentials
2. Create the database and tables: `mysql -u root -p < sql/init.sql` (or run the SQL in a MySQL client)
3. Install dependencies: `npm ci` or `npm install` if `package-lock.json` is not there
4. Start the server: `npm start` or `node server.js`
5. Visit http://localhost:3000/
6. To stop the server, use Ctrl+C in terminal
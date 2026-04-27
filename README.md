# QuizBattle - Real-time Multiplayer Quiz Game

A modern, full-stack web application for competitive quiz battles. Players can test their knowledge against the clock, compete with other players in real-time, and climb the global leaderboard.

## Features

- **Real-time Multiplayer**: Battle other players using WebSocket technology
- **Multiple Difficulty Levels**: Easy, Medium, and Hard questions
- **Global Leaderboard**: Compete and see your rank worldwide
- **User Profiles**: Track your statistics and game history
- **JWT Authentication**: Secure login with refresh tokens
- **Socket.IO Integration**: Instant game updates and real-time notifications

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Socket.IO Client** - Real-time WebSocket communication
- **Axios** - HTTP client for API calls
- **Tailwind CSS** - Utility-first styling
- **Shadcn/UI** - Component library

### Backend
- **Express.js** - Node.js web framework
- **PostgreSQL** - Relational database
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **BCryptJS** - Password hashing
- **TypeScript** - Type-safe backend

## Project Structure

```
quiz-battle/
├── apps/
│   ├── web/                 # Next.js frontend application
│   │   ├── app/            # App Router pages
│   │   ├── components/      # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   └── styles/         # Global styles
│   └── server/             # Express.js backend
│       ├── src/
│       │   ├── routes/     # API endpoints
│       │   ├── middleware/ # Express middleware
│       │   ├── lib/        # Utilities (auth, db, game)
│       │   └── index.ts    # Main server file
│       └── package.json
├── packages/
│   └── shared/             # Shared types and utilities
│       └── types.ts        # TypeScript type definitions
├── scripts/                # Database scripts
│   └── init-db.sql         # Database schema initialization
└── package.json            # Root package.json
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (local or Neon)
- npm or pnpm package manager

### Installation

1. **Clone the repository and install dependencies:**
```bash
npm install
# or
pnpm install
```

2. **Set up environment variables:**

Create `.env.local` files in both `apps/web` and `apps/server`:

**apps/web/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**apps/server/.env.local:**
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/quiz_battle
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
CLIENT_URL=http://localhost:3000
```

3. **Initialize the database:**

Run the SQL script to set up tables and sample questions:
```bash
psql -U postgres -d quiz_battle -f scripts/init-db.sql
```

Or if using Neon, copy and paste the SQL from `scripts/init-db.sql` into the Neon SQL editor.

4. **Start the development servers:**
```bash
npm run dev
# Starts both frontend (port 3000) and backend (port 3001)
```

Alternatively, run them separately:
```bash
npm run dev:web    # Frontend only
npm run dev:server # Backend only
```

## Authentication Flow

1. **Registration**: User creates account with username, email, and password
2. **Password Hashing**: Password is hashed with bcrypt (10 rounds)
3. **Token Generation**: JWT tokens issued with 7-day expiry
4. **Refresh Tokens**: Long-lived refresh tokens (30-day expiry) for token renewal
5. **Secure Storage**: Tokens stored in localStorage (client) and sent via Authorization header

## Game Flow

### Single Player Game
1. User selects difficulty level (Easy/Medium/Hard)
2. Server retrieves 10 random questions
3. 30-second timer per question
4. Score calculated (percentage of correct answers)
5. Result saved to database
6. User redirected to results page

### Multiplayer Game (Future Enhancement)
1. Create or join a game room
2. Both players receive same questions
3. Real-time answer tracking via Socket.IO
4. Results compared when both players finish
5. Winner determined by score/time

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/profile` - Get current user profile (protected)
- `GET /api/users/:username` - Get user by username
- `PUT /api/users/profile` - Update user profile (protected)

### Quiz
- `GET /api/quiz/questions?difficulty=medium&limit=10` - Get questions
- `GET /api/quiz/questions/category/:category` - Get questions by category
- `POST /api/quiz/results` - Save game result (protected)
- `GET /api/quiz/history` - Get user's game history (protected)

### Leaderboard
- `GET /api/leaderboard?limit=50&timeframe=allTime` - Get global leaderboard
- `GET /api/leaderboard/rank/:userId` - Get user's rank

## Socket.IO Events

### Client to Server
- `user:create_room` - Create a new game room
- `user:join_room` - Join existing game room
- `game:submit_answer` - Submit an answer
- `game:finish` - Finish the game

### Server to Client
- `room:created` - Room successfully created
- `room:ready` - Room ready with questions
- `game:question` - New question data
- `game:answer_received` - Confirmation of answer submission
- `game:finished` - Game has ended
- `game:player_finished` - Other player finished

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Game Results Table
```sql
CREATE TABLE game_results (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  opponent_id UUID REFERENCES users(id),
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Questions Table
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  text TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer INTEGER NOT NULL,
  category VARCHAR(255) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Adding Features

### Add New Questions
1. Connect to your database
2. Insert new questions in the `questions` table:
```sql
INSERT INTO questions (text, options, correct_answer, category, difficulty)
VALUES ('What is 2+2?', '["1", "2", "3", "4"]', 3, 'Math', 'easy');
```

### Add New API Endpoint
1. Create route file in `apps/server/src/routes/`
2. Export router and import in `apps/server/src/index.ts`
3. Add middleware (auth) as needed
4. Add TypeScript types to `packages/shared/types.ts`

### Add New Frontend Page
1. Create folder in `apps/web/app/`
2. Add `page.tsx` file
3. Import necessary hooks and components
4. Use `useAuth` for authentication and `useSocket` for real-time features

## Development Tips

- **Hot Reload**: Both frontend and backend support hot module reloading
- **Database Migrations**: Add new migrations to `scripts/` folder
- **Environment Variables**: Use `.env.local` files (never commit secrets)
- **Type Checking**: Run `npm run type-check` to validate TypeScript
- **API Testing**: Use Thunder Client, Postman, or curl for testing endpoints

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy automatically on push

### Backend (Vercel, Railway, Render, etc.)
1. Set all environment variables
2. Database must be accessible from deployment server
3. Ensure CORS settings match frontend URL

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL in `.env.local`
- Ensure PostgreSQL is running
- Check firewall/network access

### WebSocket Connection Fails
- Verify SOCKET_URL in frontend `.env.local`
- Check that backend is running on correct port
- CORS must be properly configured

### Authentication Errors
- Verify JWT secrets in backend `.env.local`
- Check token format in Authorization header
- Ensure tokens haven't expired

## Future Enhancements

- Friend system and private matches
- Timed tournaments and seasons
- Question difficulty ratings
- Custom question creation
- Chat system during games
- Mobile app with React Native
- Progressive Web App (PWA) support
- Achievements and badges system
- Video replay of games

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open a GitHub issue or contact the development team.

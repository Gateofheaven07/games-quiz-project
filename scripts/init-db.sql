-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
);

-- Create game_results table
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  difficulty VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  options JSON NOT NULL, -- Array of strings
  correct_answer INTEGER NOT NULL,
  category VARCHAR(255) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_difficulty (difficulty)
);

-- Create game_rooms table for tracking active games
CREATE TABLE IF NOT EXISTS game_rooms (
  id VARCHAR(255) PRIMARY KEY,
  player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  player1_answers JSON DEFAULT '[]',
  player2_answers JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  INDEX idx_player1_id (player1_id),
  INDEX idx_player2_id (player2_id),
  INDEX idx_status (status)
);

-- Insert sample questions
INSERT INTO questions (text, options, correct_answer, category, difficulty) VALUES
('What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 2, 'Geography', 'easy'),
('What is 2 + 2?', '["3", "4", "5", "6"]', 1, 'Math', 'easy'),
('What is the largest planet in our solar system?', '["Saturn", "Jupiter", "Neptune", "Uranus"]', 1, 'Science', 'easy'),
('Who wrote "Romeo and Juliet"?', '["George Orwell", "William Shakespeare", "Jane Austen", "Mark Twain"]', 1, 'Literature', 'easy'),
('What is the chemical symbol for gold?', '["Go", "Gd", "Au", "Ag"]', 2, 'Science', 'medium'),
('In what year did World War II end?', '["1943", "1944", "1945", "1946"]', 2, 'History', 'medium'),
('What is the smallest prime number?', '["0", "1", "2", "3"]', 2, 'Math', 'easy'),
('Which country is home to the kangaroo?', '["New Zealand", "Australia", "Fiji", "Papua New Guinea"]', 1, 'Geography', 'easy'),
('What is the boiling point of water at sea level?', '["90°C", "100°C", "110°C", "120°C"]', 1, 'Science', 'easy'),
('Who painted the Mona Lisa?', '["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"]', 1, 'Art', 'easy')
ON CONFLICT DO NOTHING;

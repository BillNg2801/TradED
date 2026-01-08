
## 🔧 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key
- SerpApi key (optional, for news/events)
- Vercel account (for deployment)

### Local Setup

1. **Clone the repository**
   
   git clone https://github.com/yourusername/TradED.git
   cd TradED/backend
   2. **Install dependencies**
   npm install
   3. **Create environment file**
   Create a `.env` file in the `backend/` directory:
  
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/FinEdu
   MONGODB_DB_NAME=FinEdu
   OPENAI_API_KEY=sk-proj-your-openai-api-key
   SERPAPI_KEY=your-serpapi-key
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   4. **Start the server**
   npm start
   5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📝 Available Scripts

### Development
- `npm start` - Start the Express server
- `npm run inspect-courses` - Inspect courses in MongoDB
- `npm run view-course` - View a specific course
- `npm run view-default` - View the default course

### Course Generation
- `npm run generate-ultimate` - Generate 4 ultimate course variations (5, 10, 15, 20 lessons)
- `npm run expand-courses` - Expand course content using OpenAI
- `npm run cleanup-courses` - Clean up course content (remove meta-commentary)
- `npm run generate-ultimate-quizzes` - Generate quiz packs for all courses
- `npm run test-openai-key` - Test OpenAI API key configuration

## 🗄️ Database Schema

### Collections

#### `users`
{
  userId: String,
  email: String,
  name: String,
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}#### `personalStats`vascript
{
  userId: String,
  email: String,
  userName: String,
  screen1: String,        // Market focus (Forex/Stocks/Crypto)
  screen2: String,       // Confidence level
  screen3: Array,        // Financial goals
  screen4: String,       // Current situation
  screen5: String,       // Course pace (5/10/15/20 lessons)
  quizProgress: {
    [quizNumber]: {
      passed: Boolean,
      answers: Array,
      pace: Number,
      completedAt: Date
    }
  },
  createdAt: Date,
  updatedAt: Date
}#### `courses`
{
  _id: ObjectId,
  name: String,
  type: String,          // "ultimate"
  lessonCount: Number,   // 5, 10, 15, or 20
  lessons: [{
    topic: String,
    content: String,
    images: [{
      url: String,
      paragraphIndex: Number
    }]
  }],
  createdAt: Date,
  updatedAt: Date
}#### `UltimateQuizzes`cript
{
  _id: ObjectId,
  courseId: ObjectId,
  pace: Number,          // 5, 10, 15, or 20
  quizzes: [{
    quizNumber: Number,
    lessonNumber: Number,
    questions: [{
      question: String,
      choices: [String],  // 5 choices
      correctIndex: Number  // 0-4
    }]
  }],
  createdAt: Date,
  updatedAt: Date
}#### `messages`ipt
{
  messageId: String,
  userId: String,
  userName: String,
  message: String,
  timestamp: Date,
  createdAt: Date
}## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `MONGODB_DB_NAME` | Database name (default: FinEdu) | No |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `SERPAPI_KEY` | SerpApi key for news/events | No |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time (default: 7d) | No |

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   
   npm i -g vercel
   2. **Login to Vercel**
   vercel login
   3. **Deploy**
  
   cd backend
   vercel
   4. **Set Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all required environment variables (see above)

5. **Configure MongoDB Atlas**
   - Go to MongoDB Atlas → Network Access
   - Add IP Address: `0.0.0.0/0` (Allow from anywhere)
   - This is required for Vercel's dynamic IP addresses

### Important Notes for Deployment
- MongoDB Atlas must allow connections from `0.0.0.0/0` for Vercel serverless functions
- All environment variables must be set in Vercel dashboard
- The `vercel.json` file configures the serverless function routing

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Courses
- `GET /api/courses/user/custom` - Get user's personalized course
- `POST /api/courses/chatbot` - Chat with course assistant

### Quizzes
- `GET /api/courses/quizzes/user/custom` - Get user's quizzes
- `POST /api/courses/quizzes/progress` - Save quiz progress

### Chat
- `GET /api/chat/messages` - Get chat messages
- `POST /api/chat/messages` - Send a message

### Events
- `GET /api/events` - Get trading events and workshops

## 🎨 Features in Detail

### Course System
- **Pre-generated Courses**: 4 ultimate course variations are generated once and stored in MongoDB
- **Pace Selection**: Users choose their preferred learning pace during signup survey
- **Lesson Progression**: Lessons unlock after passing previous quizzes
- **AI Chatbot**: Context-aware assistant that answers questions about current lesson

### Quiz System
- **One-to-One Mapping**: Each quiz corresponds to exactly one lesson
- **Dynamic Question Count**: More questions per quiz for shorter courses
- **Pass Criteria**: 
  - 20 lessons: 100% correct (0 mistakes)
  - 15/10/5 lessons: 1 mistake or fewer
- **Progress Persistence**: Quiz progress saved in user's `personalStats`

### Chat System
- **Real-time Messaging**: Community chat for all users
- **Authentication Required**: Only logged-in users can send/receive messages
- **Auto-refresh**: Messages load automatically (disabled to prevent spam)

## 🐛 Troubleshooting

### MongoDB Connection Issues
- **Error**: `MongoServerSelectionError: SSL routines`
- **Solution**: Add `0.0.0.0/0` to MongoDB Atlas Network Access whitelist

### OpenAI API Errors
- **Error**: `Request too large`
- **Solution**: Content is automatically truncated, but may need further optimization

### Chat Loading Issues
- **Error**: Chat shows "Loading messages..." indefinitely
- **Solution**: Check browser console for errors, verify JWT token is valid


**by Bill Nguyen**



---

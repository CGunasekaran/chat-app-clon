# WhatsApp Clone - Real-time Chat Application

A full-featured real-time chat application built with Next.js, Prisma, PostgreSQL, and Socket.io. Features include group chats, one-to-one messaging, file sharing, typing indicators, read receipts, and email verification.

## Features

### 🔐 Authentication & Security
- Email verification with OTP during registration
- Secure password hashing with bcryptjs
- NextAuth for session management
- Admin user roles

### 💬 Messaging
- Real-time group chats
- One-to-one direct messaging
- File sharing (images and documents up to 10MB)
- Typing indicators with user names
- Read receipts with tooltips
- Message history

### 👥 User Management
- User search functionality
- Color-coded avatars with initials
- Visual distinction between users and groups
- User profiles

### 🎨 UI/UX
- Modern, responsive design with Tailwind CSS
- Gradient color palette for avatars
- Real-time updates
- Loading states and error handling
- Professional email templates

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CGunasekaran/chat-app-clon.git
cd whatsapp-clone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_clone"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

NODE_ENV="development"
```

4. Set up the database:
```bash
npx prisma db push
```

5. (Optional) Create test users:
```bash
node scripts/create-test-users.js
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Email Setup

### Gmail Configuration

1. Enable 2-Factor Authentication on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use the 16-character password in `EMAIL_PASSWORD`

**Note:** In development mode, if email credentials are not configured, OTPs will be logged to the console.

See [Email Verification Documentation](docs/EMAIL_VERIFICATION.md) for detailed setup.

## Project Structure

```
whatsapp-clone/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── register/        # Multi-step registration with OTP
│   ├── (dashboard)/         # Protected pages
│   │   ├── admin/           # Admin dashboard
│   │   ├── chat/            # Chat interface
│   │   └── groups/
│   └── api/                 # API routes
│       ├── auth/            # Authentication endpoints
│       │   ├── send-otp/    # OTP generation and sending
│       │   ├── verify-otp/  # OTP verification
│       │   └── register/    # User registration
│       ├── chats/           # One-to-one chat creation
│       ├── groups/          # Group management
│       ├── messages/        # Message CRUD
│       └── users/           # User search
├── components/              # React components
│   ├── chat/
│   ├── groups/
│   └── ui/
├── lib/                     # Utilities
│   ├── auth.ts              # NextAuth configuration
│   ├── email.ts             # Email service
│   ├── prisma.ts            # Prisma client
│   └── socket.ts            # Socket.io setup
├── prisma/
│   └── schema.prisma        # Database schema
└── docs/                    # Documentation
    └── EMAIL_VERIFICATION.md
```

## Key Technologies

- **Framework:** Next.js 16.1.0 with App Router
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** Socket.io 4.8.1
- **Authentication:** NextAuth 4.24.13
- **Styling:** Tailwind CSS
- **Email:** Nodemailer
- **Icons:** Lucide React

## Features Documentation

### Email Verification Flow
See [docs/EMAIL_VERIFICATION.md](docs/EMAIL_VERIFICATION.md) for:
- Complete registration flow
- OTP generation and validation
- Email configuration
- Security considerations

### File Sharing
- Supported types: Images (jpg, png, gif) and Documents (pdf, doc, docx, txt)
- Maximum file size: 10MB
- Files stored in `public/uploads`
- Preview support for images

### One-to-One Chat
- Search users by name or email
- Create direct message conversations
- Visual differentiation from group chats
- Unique color-coded avatars

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio
- `npx prisma db push` - Push schema changes to database

## Database Schema

Main models:
- `User` - User accounts
- `Group` - Chat groups (includes one-to-one chats)
- `Message` - Chat messages with file support
- `MessageRead` - Read receipts
- `GroupMember` - Group memberships
- `EmailVerification` - OTP verification records

## Development

### Creating Test Users

Use the provided script to create test accounts:
```bash
node scripts/create-test-users.js
```

This creates:
- `admin@test.com` (admin user)
- `user1@test.com`
- `user2@test.com`


### Database Migrations

```bash
# Push schema changes
npx prisma db push

# Generate Prisma Client
npx prisma generate

# View data in browser
npx prisma studio
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Steps

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations:
   ```bash
   DATABASE_URL="your-prod-url" npx prisma db push
   ```
4. Build and start:
   ```bash
   npm run build
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes.

## Support

For issues and questions:
- GitHub Issues: https://github.com/CGunasekaran/chat-app-clon/issues

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Socket.io Documentation](https://socket.io/docs)
- [NextAuth Documentation](https://next-auth.js.org)


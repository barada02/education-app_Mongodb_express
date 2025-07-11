# Education App - Frontend

A modern, responsive frontend for the AI-powered educational application. Built with vanilla HTML, CSS, and JavaScript for optimal performance and simplicity.

## Features

- **Modern UI/UX**: Clean, responsive design with gradient backgrounds and smooth animations
- **Educational Content Generation**: Interactive form to generate AI-powered educational content
- **Interactive Quiz System**: Take quizzes based on generated content with real-time scoring
- **Learning History**: View and reload previously generated educational content
- **Real-time Feedback**: Toast notifications and loading states for better user experience
- **Mobile Responsive**: Optimized for all device sizes

## Technology Stack

- **HTML5**: Semantic markup and modern web standards
- **CSS3**: Flexbox, Grid, animations, and responsive design
- **JavaScript (ES6+)**: Modern JavaScript with async/await and modules
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Inter font family for better typography

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Backend server running on port 5000
- FastAPI Gemini service running on port 8000

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if any):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit:
   ```
   http://localhost:3000
   ```

## File Structure

```
frontend/
├── index.html          # Main HTML file
├── styles.css          # Stylesheet with responsive design
├── script.js           # JavaScript application logic
├── server.js           # Simple HTTP server for development
├── package.json        # NPM configuration
└── README.md          # This file
```

## API Integration

The frontend communicates with the Express.js backend through RESTful APIs:

- `POST /api/generate` - Generate educational content
- `GET /api/content` - Retrieve learning history
- `GET /api/content/:id` - Get specific content by ID

## Configuration

The API base URL is configured in `script.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

Update this URL if your backend runs on a different port or domain.

## Features Overview

### 1. Content Generation
- Topic input with validation
- Difficulty level selection (Beginner, Intermediate, Advanced)
- Real-time AI content generation
- Structured display of concepts and examples

### 2. Quiz System
- Interactive multiple-choice questions
- Progress tracking
- Score calculation
- Question review with correct answers
- Ability to retake quizzes

### 3. Navigation
- Single-page application with smooth transitions
- Active section highlighting
- Keyboard shortcuts (Ctrl+Enter to generate)

### 4. Responsive Design
- Mobile-first approach
- Flexible layouts for all screen sizes
- Touch-friendly interface elements

## Customization

### Styling
Modify `styles.css` to customize:
- Color scheme (CSS custom properties)
- Typography
- Layout and spacing
- Animations and transitions

### Functionality
Extend `script.js` to add:
- Additional quiz types
- Progress tracking
- User preferences
- Offline capabilities

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Development

### Local Development
```bash
npm run dev
```

### Building for Production
For production deployment, serve the static files using:
- Nginx
- Apache
- CDN (CloudFlare, AWS CloudFront)
- Static hosting (Netlify, Vercel)

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure the backend has CORS enabled
   - Check the API base URL configuration

2. **Content Not Loading**
   - Verify the backend server is running
   - Check browser developer tools for errors
   - Confirm API endpoints are accessible

3. **Styling Issues**
   - Clear browser cache
   - Check CSS file is loading correctly
   - Verify Font Awesome CDN is accessible

### Debug Mode
Open browser developer tools (F12) to see:
- Network requests
- Console logs
- JavaScript errors

## Performance

- Optimized CSS with minimal external dependencies
- Efficient JavaScript with event delegation
- Lazy loading for better performance
- Minimal DOM manipulation

## Security

- Input validation and sanitization
- XSS prevention
- CORS configuration
- No sensitive data in frontend code

## Contributing

1. Follow the existing code style
2. Test on multiple browsers
3. Ensure responsive design works
4. Add comments for complex logic
5. Update documentation as needed

## License

MIT License - See LICENSE file for details

# Recipe Swipe App 🍳

A beautiful recipe discovery app with AI-powered recipe generation, built with a Japandi-inspired design.

## Features

- **Tinder-like swipe interface** for recipe discovery
- **AI recipe generation** using Ollama (Mistral model)
- **Beautiful flip cards** with sparkles and animations
- **Japandi design** with subtle colors and elegant typography
- **Full-screen swipe feedback** with color-coded glows
- **Responsive recipe display** with formatted ingredients and instructions

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **AI**: Ollama with Mistral model
- **Styling**: Custom CSS with Google Fonts (Noto Sans, Playfair Display)

## Prerequisites

- Node.js (v18+)
- Ollama installed and running with Mistral model
- Recipe images in `/images` folder

## Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd recipe-swipe-app
```

2. Install dependencies
```bash
npm install
```

3. Start Ollama (if not already running)
```bash
ollama serve
```

4. Start the server
```bash
node server.js
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Swipe right** 👍 for recipes you like
2. **Swipe left** 👎 for recipes you don't like  
3. After 5 rounds, see your winner with sparkles
4. **Click the card** to flip it
5. **Generate Recipe** to get AI-powered recipe details
6. **Scroll** through the beautifully formatted recipe

## Project Structure

```
recipe-swipe-app/
├── src/                    # Source code
│   ├── App.js             # Main application logic
│   ├── components/        # Reusable UI components
│   ├── core/             # Core functionality
│   ├── platforms/        # Platform-specific code
│   ├── shared/           # Shared utilities
│   ├── utils/            # Helper functions
│   └── data/             # Application data
├── public/                # Static assets
│   ├── index.html        # Main HTML file
│   ├── mobile.html       # Mobile version
│   ├── profile-picker.html # Profile selection
│   ├── css/              # Stylesheets
│   │   ├── style.css     # Main styles
│   │   └── mobile.css    # Mobile styles
│   └── images/           # Recipe images
├── archive/               # Archived legacy files
├── config/               # Configuration files
├── scripts/              # Build and utility scripts
├── server.js             # Express server
├── package.json          # Dependencies and scripts
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
└── README.md             # This file
```

## Customization

- **Add recipes**: Update the `recipes` array in `app.js`
- **Change colors**: Modify CSS variables in `style.css`
- **Adjust AI model**: Change the model in `server.js`
- **Add images**: Place new recipe images in `/images`

## License

MIT License - feel free to use this for your own projects!

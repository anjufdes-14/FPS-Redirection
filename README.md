# FPS Redirection System - Production Ready

A comprehensive web application for managing Fair Price Shop (FPS) assignments and beneficiary redirections. This system helps government authorities efficiently manage FPS shop operations, assign beneficiaries to optimal locations, and handle shop closures with automatic customer reassignment.

## 🚀 Features

### Core Functionality
- **FPS Shop Management**: Add, edit, and manage Fair Price Shop data
- **Beneficiary Management**: Upload and manage beneficiary/customer data
- **Dynamic Assignment**: Automatically assign beneficiaries to nearest open FPS shops
- **Real-time Routing**: Calculate optimal routes using OpenRouteService (ORS) API
- **Interactive Map**: Visualize FPS shops, beneficiaries, and routes on an interactive map
- **Shop Closure Handling**: Automatic reassignment when FPS shops are closed

### Advanced Features
- **Batch Processing**: Efficient handling of large datasets
- **Rate Limiting**: Built-in API rate limiting to prevent service overload
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Fallback Routes**: Straight-line distance calculation when routing fails
- **Authentication**: Secure access using Clerk authentication
- **Export Functionality**: Download results as CSV files

### Technical Features
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error handling and user feedback
- **Performance Optimization**: Adaptive delays and efficient API usage
- **Real-time Updates**: Live status updates during processing

## 🛠️ Tech Stack

### Frontend
- **React.js** - Main framework
- **React Bootstrap** - UI components
- **Leaflet** - Interactive maps
- **Axios** - HTTP client
- **Clerk** - Authentication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client for API calls
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection

### APIs & Services
- **OpenRouteService (ORS)** - Routing and distance calculations
- **Clerk** - User authentication and management

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vedant-00/Internship-Project.git
   cd Internship-Project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```
   
   Create a `.env` file in the `src/backend` directory:
   ```env
   ORS_API_KEY=your_openrouteservice_api_key
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   PORT=5001
   ```

4. **Start the backend server**
   ```bash
   cd src/backend
   node server.js
   ```

5. **Start the frontend application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001

## 🔧 Configuration

### OpenRouteService Setup
1. Register at [OpenRouteService](https://openrouteservice.org/)
2. Get your API key
3. Add it to your backend `.env` file

### Clerk Authentication Setup
1. Create an account at [Clerk](https://clerk.com/)
2. Create a new application
3. Get your publishable key
4. Add it to both frontend and backend `.env` files

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fps-redirection-frontend1
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
# OpenRouteService API Key
# Get your free API key from: https://openrouteservice.org/dev/#/signup
ORS_API_KEY=your_ors_api_key_here

# Server port
PORT=5000

# React app port
REACT_APP_PORT=3000
```

4. Replace `your_ors_api_key_here` with your actual OpenRouteService API key.

## Running the Application

### Development Mode (Recommended)
Run both frontend and backend simultaneously:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- React development server on http://localhost:3000

### Production Mode
1. Build the React app:
```bash
npm run build
```

2. Start the backend server:
```bash
npm run server
```

## Data Format Requirements

### FPS Shops Data (Excel)
Required columns:
- `srno`: Serial number
- `fps_id`: FPS identifier
- `fps_name`: FPS name
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate
- `status`: Status (open/closed)

### Beneficiary Data (Excel)
Required columns:
- `RationCardNo`: Ration card number
- `FPSCode`: Assigned FPS code
- `MemberId`: Member identifier
- `Member_Name_EN`: Beneficiary name
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate

## Usage

1. **Upload Data**: Use the upload sections to load your FPS and beneficiary data files.

2. **Select FPS to Close**: In the FPS management table, check the boxes for FPS shops you want to close.

3. **Run Redirection**: Click "Reassign Beneficiaries (Road Distance)" to process the redirection.

4. **View Results**: 
   - Check the map for visual representation
   - Review the results table
   - Download results as CSV

## API Endpoints

- `POST /api/ors/matrix`: Proxy endpoint for OpenRouteService matrix API

## Technologies Used

- **Frontend**: React, React Bootstrap, Leaflet
- **Backend**: Express.js, Node.js
- **APIs**: OpenRouteService for road distance calculations
- **File Processing**: XLSX for Excel file parsing

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your OpenRouteService API key is correctly set in the `.env` file.

2. **Port Conflicts**: If ports 3000 or 5000 are in use, modify the ports in the `.env` file.

3. **File Upload Issues**: Ensure your Excel files have the correct column headers and data format.

4. **Map Not Loading**: Check if you have an internet connection for loading map tiles.

### Error Messages

- "ORS API failed": Check your API key and internet connection
- "Missing columns": Verify your Excel file has all required columns
- "No valid data found": Check your data format and coordinates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added retry logic and performance improvements
- **v1.2.0** - Enhanced UI/UX and authentication
- **v1.3.0** - Improved error handling and map features

---

**Built with ❤️ for efficient government service delivery**

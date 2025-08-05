import express from "express"
import { configDotenv } from "dotenv"
import cors from 'cors';
import { salesRouter } from "./routes/sales.routes.js" // Corrected path based on your previous input

// Import Swagger packages
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'

configDotenv()

const app = express()
const PORT = process.env.PORT || 3000 // Provide a default port if not set in .env

app.use(express.json())
app.use(cors());

// --- Swagger Setup Start ---

// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.3', // Use the version you prefer or is appropriate
    info: {
      title: 'Machine Learning Repository Sales API',
      version: '1.0.0',
      description: 'API for managing and analyzing sales data from a Machine Learning repository, optimized with PostgreSQL.',
      contact: {
        name: 'GROUP 6', // Replace with your group info
        url: 'https://yourgithub.com/your-repo', // Replace with your GitHub link
        email: 'your_email@example.com', // Optional: your contact email
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`, // Base path for your API routes
        description: 'Development Server',
      },
      {
        url: 'https://deployed-api-advanceddb-group-6.onrender.com',
        description: 'Render Deployment (Production)',
      },
      // You can add your OCI deployed server URL here later:
      // {
      //   url: 'https://your-oci-app-url.com/api',
      //   description: 'Production Server (OCI)',
      // },
    ],
    // The components section where your schemas are defined
    components: {
      schemas: {
        // This 'SalesData' schema definition MUST match the one you have in your sales.routes.js
        // It's good practice to have this here as the central definition for Swagger.
        SalesData: {
          type: 'object',
          required: [
            'invoiceNo',
            'stockCode',
            'quantity',
            'invoiceDate',
            'unitPrice',
            'country'
          ],
          properties: {
            invoiceNo: { type: 'string', maxLength: 20, description: 'Invoice number' },
            stockCode: { type: 'string', maxLength: 20, description: 'Product stock code' },
            description: { type: 'string', maxLength: 255, description: 'Product description' },
            quantity: { type: 'integer', description: 'Quantity sold' },
            invoiceDate: { type: 'string', format: 'date-time', description: 'Date and time of invoice' },
            unitPrice: { type: 'number', format: 'float', description: 'Unit price of the product' }, // Use 'float' or 'double' for format if applicable
            customerId: { type: 'integer', nullable: true, description: 'Customer ID (nullable)' },
            country: { type: 'string', maxLength: 100, description: 'Country of sale' }
          },
          example: { // An example object that conforms to the schema
            invoiceNo: "536365",
            stockCode: "85123A",
            description: "WHITE HANGING HEART T-LIGHT HOLDER",
            quantity: 6,
            invoiceDate: "2010-12-01T08:26:00.000Z",
            unitPrice: 2.55,
            customerId: 17850,
            country: "United Kingdom"
          }
        }
      }
    }
  },
  // Point to the files containing your JSDoc Swagger comments
  apis: ['./routes/*.routes.js'], // Adjust this path if your route files are elsewhere
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Your API is Active" })
})
// Serve the Swagger UI at a specific endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- Swagger Setup End ---

// Your application routes
app.use("/api/sales", salesRouter)

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`)
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`) // Let the user know where to find it
  console.log(`Production Swagger UI available at https://deployed-api-advanceddb-group-6.onrender.com/api-docs`) // Let the user know where to find it
})


import {Router} from 'express';
import { db } from '../config/db.js';
import { salesData } from '../DB/schema.js';
import { eq, and, gte, lte, desc, asc, sql, count, sum } from 'drizzle-orm';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SalesData:
 *       type: object
 *       required:
 *         - invoiceNo
 *         - stockCode
 *         - quantity
 *         - invoiceDate
 *         - unitPrice
 *         - country
 *       properties:
 *         invoiceNo:
 *           type: string
 *           maxLength: 20
 *           description: Invoice number
 *         stockCode:
 *           type: string
 *           maxLength: 20
 *           description: Product stock code
 *         description:
 *           type: string
 *           maxLength: 255
 *           description: Product description
 *         quantity:
 *           type: integer
 *           description: Quantity sold
 *         invoiceDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of invoice
 *         unitPrice:
 *           type: number
 *           format: decimal
 *           description: Unit price of the product
 *         customerId:
 *           type: integer
 *           description: Customer ID (nullable)
 *         country:
 *           type: string
 *           maxLength: 100
 *           description: Country of sale
 *       example:
 *         invoiceNo: "536365"
 *         stockCode: "85123A"
 *         description: "WHITE HANGING HEART T-LIGHT HOLDER"
 *         quantity: 6
 *         invoiceDate: "2010-12-01T08:26:00.000Z"
 *         unitPrice: 2.55
 *         customerId: 17850
 *         country: "United Kingdom"
 */


/**
 * @swagger
 * /api/sales/analytics/summary:
 *   get:
 *     summary: Get sales analytics summary
 *     tags: [Sales Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *     responses:
 *       200:
 *         description: Sales analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                     totalQuantity:
 *                       type: integer
 *                     totalOrders:
 *                       type: integer
 *                     averageOrderValue:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/analytics/summary', async (req, res) => {
    try {
        const { startDate, endDate, country } = req.query;
        
        // Build where conditions
        const conditions = [];
        
        if (startDate) {
            conditions.push(gte(salesData.invoiceDate, new Date(startDate)));
        }
        
        if (endDate) {
            conditions.push(lte(salesData.invoiceDate, new Date(endDate)));
        }
        
        if (country) {
            conditions.push(eq(salesData.country, country));
        }

        const result = await db.select({
            totalSales: sum(sql`${salesData.quantity} * ${salesData.unitPrice}`),
            totalQuantity: sum(salesData.quantity),
            totalOrders: count(),
            averageOrderValue: sql`AVG(${salesData.quantity} * ${salesData.unitPrice})`
        })
        .from(salesData)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

        const summary = result[0];
        
        res.json({
            success: true,
            data: {
                totalSales: parseFloat(summary.totalSales || 0),
                totalQuantity: parseInt(summary.totalQuantity || 0),
                totalOrders: parseInt(summary.totalOrders || 0),
                averageOrderValue: parseFloat(summary.averageOrderValue || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching sales analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales analytics',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales/analytics/top-products:
 *   get:
 *     summary: Get top-selling products
 *     tags: [Sales Analytics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top products to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of top-selling products
 *       500:
 *         description: Server error
 */
router.get('/analytics/top-products', async (req, res) => {
    try {
        const { limit = 10, startDate, endDate } = req.query;
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        
        // Build where conditions
        const conditions = [];
        
        if (startDate) {
            conditions.push(gte(salesData.invoiceDate, new Date(startDate)));
        }
        
        if (endDate) {
            conditions.push(lte(salesData.invoiceDate, new Date(endDate)));
        }

        const result = await db.select({
            stockCode: salesData.stockCode,
            description: salesData.description,
            totalQuantity: sum(salesData.quantity),
            totalRevenue: sum(sql`${salesData.quantity} * ${salesData.unitPrice}`),
            averagePrice: sql`AVG(${salesData.unitPrice})`
        })
        .from(salesData)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(salesData.stockCode, salesData.description)
        .orderBy(desc(sum(salesData.quantity)))
        .limit(limitNum);

        res.json({
            success: true,
            data: result.map(item => ({
                stockCode: item.stockCode,
                description: item.description,
                totalQuantity: parseInt(item.totalQuantity),
                totalRevenue: parseFloat(item.totalRevenue),
                averagePrice: parseFloat(item.averagePrice)
            }))
        });
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top products',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales records with pagination and filtering
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records per page (max 1000)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [invoiceDate, unitPrice, quantity]
 *           default: invoiceDate
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of sales records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesData'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            country,
            customerId,
            startDate,
            endDate,
            sortBy = 'invoiceDate',
            sortOrder = 'desc'
        } = req.query;

        // Validate and sanitize inputs
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build where conditions
        const conditions = [];
        
        if (country) {
            conditions.push(eq(salesData.country, country));
        }
        
        if (customerId) {
            conditions.push(eq(salesData.customerId, parseInt(customerId)));
        }
        
        if (startDate) {
            conditions.push(gte(salesData.invoiceDate, new Date(startDate)));
        }
        
        if (endDate) {
            conditions.push(lte(salesData.invoiceDate, new Date(endDate)));
        }

        // Build sort order
        const sortField = salesData[sortBy] || salesData.invoiceDate;
        const orderBy = sortOrder === 'asc' ? asc(sortField) : desc(sortField);

        // Execute queries in parallel
        const [records, totalCount] = await Promise.all([
            db.select()
                .from(salesData)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(orderBy)
                .limit(limitNum)
                .offset(offset),
            
            db.select({ count: count() })
                .from(salesData)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
        ]);

        const total = totalCount[0].count;
        const totalPages = Math.ceil(total / limitNum);

        res.json({
            success: true,
            data: records,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: parseInt(total),
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching sales records:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales records',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales/{invoiceNo}/{stockCode}:
 *   get:
 *     summary: Get a specific sales record by invoice number and stock code
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: invoiceNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number
 *       - in: path
 *         name: stockCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock code
 *     responses:
 *       200:
 *         description: Sales record found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesData'
 *       404:
 *         description: Sales record not found
 *       500:
 *         description: Server error
 */
router.get('/:invoiceNo/:stockCode', async (req, res) => {
    try {
        const { invoiceNo, stockCode } = req.params;

        const record = await db.select()
            .from(salesData)
            .where(
                and(
                    eq(salesData.invoiceNo, invoiceNo),
                    eq(salesData.stockCode, stockCode)
                )
            )
            .limit(1);

        if (record.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sales record not found'
            });
        }

        res.json({
            success: true,
            data: record[0]
        });
    } catch (error) {
        console.error('Error fetching sales record:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales record',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create a new sales record
 *     tags: [Sales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalesData'
 *     responses:
 *       201:
 *         description: Sales record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesData'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
    try {
        const {
            invoiceNo,
            stockCode,
            description,
            quantity,
            invoiceDate,
            unitPrice,
            customerId,
            country
        } = req.body;

        // Validate required fields
        if (!invoiceNo || !stockCode || !quantity || !invoiceDate || !unitPrice || !country) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: invoiceNo, stockCode, quantity, invoiceDate, unitPrice, country'
            });
        }

        // Validate data types
        if (isNaN(quantity) || isNaN(parseFloat(unitPrice))) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be an integer and unitPrice must be a number'
            });
        }

        const newRecord = {
            invoiceNo: invoiceNo.toString(),
            stockCode: stockCode.toString(),
            description: description || null,
            quantity: parseInt(quantity),
            invoiceDate: new Date(invoiceDate),
            unitPrice: parseFloat(unitPrice).toFixed(2),
            customerId: customerId ? parseInt(customerId) : null,
            country: country.toString()
        };

        const result = await db.insert(salesData)
            .values(newRecord)
            .returning();

        res.status(201).json({
            success: true,
            message: 'Sales record created successfully',
            data: result[0]
        });
    } catch (error) {
        console.error('Error creating sales record:', error);
        
        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Sales record with this invoice number and stock code already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create sales record',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales/{invoiceNo}/{stockCode}:
 *   put:
 *     summary: Update a sales record
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: invoiceNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number
 *       - in: path
 *         name: stockCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalesData'
 *     responses:
 *       200:
 *         description: Sales record updated successfully
 *       404:
 *         description: Sales record not found
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.put('/:invoiceNo/:stockCode', async (req, res) => {
    try {
        const { invoiceNo, stockCode } = req.params;
        const {
            description,
            quantity,
            invoiceDate,
            unitPrice,
            customerId,
            country
        } = req.body;

        // Build update object with only provided fields
        const updateData = {};
        
        if (description !== undefined) updateData.description = description;
        if (quantity !== undefined) {
            if (isNaN(quantity)) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity must be a number'
                });
            }
            updateData.quantity = parseInt(quantity);
        }
        if (invoiceDate !== undefined) updateData.invoiceDate = new Date(invoiceDate);
        if (unitPrice !== undefined) {
            if (isNaN(parseFloat(unitPrice))) {
                return res.status(400).json({
                    success: false,
                    message: 'Unit price must be a number'
                });
            }
            updateData.unitPrice = parseFloat(unitPrice).toFixed(2);
        }
        if (customerId !== undefined) updateData.customerId = customerId ? parseInt(customerId) : null;
        if (country !== undefined) updateData.country = country;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided for update'
            });
        }

        const result = await db.update(salesData)
            .set(updateData)
            .where(
                and(
                    eq(salesData.invoiceNo, invoiceNo),
                    eq(salesData.stockCode, stockCode)
                )
            )
            .returning();

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sales record not found'
            });
        }

        res.json({
            success: true,
            message: 'Sales record updated successfully',
            data: result[0]
        });
    } catch (error) {
        console.error('Error updating sales record:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update sales record',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales/{invoiceNo}/{stockCode}:
 *   delete:
 *     summary: Delete a sales record
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: invoiceNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number
 *       - in: path
 *         name: stockCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock code
 *     responses:
 *       200:
 *         description: Sales record deleted successfully
 *       404:
 *         description: Sales record not found
 *       500:
 *         description: Server error
 */
router.delete('/:invoiceNo/:stockCode', async (req, res) => {
    try {
        const { invoiceNo, stockCode } = req.params;

        const result = await db.delete(salesData)
            .where(
                and(
                    eq(salesData.invoiceNo, invoiceNo),
                    eq(salesData.stockCode, stockCode)
                )
            )
            .returning();

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sales record not found'
            });
        }

        res.json({
            success: true,
            message: 'Sales record deleted successfully',
            data: result[0]
        });
    } catch (error) {
        console.error('Error deleting sales record:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete sales record',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales/analytics/summary:
 *   get:
 *     summary: Get sales analytics summary
 *     tags: [Sales Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *     responses:
 *       200:
 *         description: Sales analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                     totalQuantity:
 *                       type: integer
 *                     totalOrders:
 *                       type: integer
 *                     averageOrderValue:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/analytics/summary', async (req, res) => {
    try {
        const { startDate, endDate, country } = req.query;
        
        // Build where conditions
        const conditions = [];
        
        if (startDate) {
            conditions.push(gte(salesData.invoiceDate, new Date(startDate)));
        }
        
        if (endDate) {
            conditions.push(lte(salesData.invoiceDate, new Date(endDate)));
        }
        
        if (country) {
            conditions.push(eq(salesData.country, country));
        }

        const result = await db.select({
            totalSales: sum(sql`${salesData.quantity} * ${salesData.unitPrice}`),
            totalQuantity: sum(salesData.quantity),
            totalOrders: count(),
            averageOrderValue: sql`AVG(${salesData.quantity} * ${salesData.unitPrice})`
        })
        .from(salesData)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

        const summary = result[0];
        
        res.json({
            success: true,
            data: {
                totalSales: parseFloat(summary.totalSales || 0),
                totalQuantity: parseInt(summary.totalQuantity || 0),
                totalOrders: parseInt(summary.totalOrders || 0),
                averageOrderValue: parseFloat(summary.averageOrderValue || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching sales analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales analytics',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/sales/analytics/top-products:
 *   get:
 *     summary: Get top-selling products
 *     tags: [Sales Analytics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top products to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of top-selling products
 *       500:
 *         description: Server error
 */
router.get('/analytics/top-products', async (req, res) => {
    try {
        const { limit = 10, startDate, endDate } = req.query;
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        
        // Build where conditions
        const conditions = [];
        
        if (startDate) {
            conditions.push(gte(salesData.invoiceDate, new Date(startDate)));
        }
        
        if (endDate) {
            conditions.push(lte(salesData.invoiceDate, new Date(endDate)));
        }

        const result = await db.select({
            stockCode: salesData.stockCode,
            description: salesData.description,
            totalQuantity: sum(salesData.quantity),
            totalRevenue: sum(sql`${salesData.quantity} * ${salesData.unitPrice}`),
            averagePrice: sql`AVG(${salesData.unitPrice})`
        })
        .from(salesData)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(salesData.stockCode, salesData.description)
        .orderBy(desc(sum(salesData.quantity)))
        .limit(limitNum);

        res.json({
            success: true,
            data: result.map(item => ({
                stockCode: item.stockCode,
                description: item.description,
                totalQuantity: parseInt(item.totalQuantity),
                totalRevenue: parseFloat(item.totalRevenue),
                averagePrice: parseFloat(item.averagePrice)
            }))
        });
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top products',
            error: error.message
        });
    }
});

export {router as salesRouter};
import express, { Router } from "express"
import ErrorHandler from "../helper"
import { body, check, param, query } from "express-validator"
import ProductController from "../controllers/productController"
import Authenticator from "./auth"
import { Product } from "../components/product"

/**
 * Represents a class that defines the routes for handling proposals.
 */
class ProductRoutes {
    private controller: ProductController
    private router: Router
    private errorHandler: ErrorHandler
    private authenticator: Authenticator

    /**
     * Constructs a new instance of the ProductRoutes class.
     * @param {Authenticator} authenticator - The authenticator object used for authentication.
     */
    constructor(authenticator: Authenticator) {
        this.authenticator = authenticator
        this.controller = new ProductController()
        this.router = express.Router()
        this.errorHandler = new ErrorHandler()
        this.initRoutes()
    }

    /**
     * Returns the router instance.
     * @returns The router instance.
     */
    getRouter(): Router {
        return this.router
    }

    /**
     * Initializes the routes for the product router.
     * 
     * @remarks
     * This method sets up the HTTP routes for handling product-related operations such as registering products, registering arrivals, selling products, retrieving products, and deleting products.
     * It can (and should!) apply authentication, authorization, and validation middlewares to protect the routes.
     * 
     */
    initRoutes() {

        /**
         * Route for registering the arrival of a set of products.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the following parameters:
         * - model: string. It cannot be empty and it cannot be repeated in the database.
         * - category: string (one of "Smartphone", "Laptop", "Appliance")
         * - quantity: number. It must be greater than 0.
         * - details: string. It can be empty.
         * - sellingPrice: number. It must be greater than 0.
         * - arrivalDate: string. It can be omitted. If present, it must be a valid date in the format YYYY-MM-DD that is not after the current date
         * It returns a 200 status code if the arrival was registered successfully.
         */
        this.router.post(
            "/",
            this.authenticator.isLoggedIn,
            this.authenticator.isAdminOrManager,
            [   check ("model").isString().notEmpty(),
                check("category").isString().isIn(["Smartphone", "Laptop", "Appliance"]),
                check("quantity").isNumeric().isInt({ gt: 0 }),
                check("details").isString().optional(),
                check("sellingPrice").isNumeric().isFloat({ gt: 0 }),
                check("arrivalDate").isString().optional().isISO8601()
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => this.authenticator.isAdminOrManager(req,res ,()=>{this.controller.registerProducts(req.body.model, req.body.category, req.body.quantity, req.body.details, req.body.sellingPrice, req.body.arrivalDate)
                .then(() => res.status(200).end())
                .catch((err) => next(err))
            })
        )

        /**
         * Route for registering the increase in quantity of a product.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the product model as a request parameter. The model must be a string and cannot be empty, and it must represent an existing product.
         * It requires the following body parameters:
         * - quantity: number. It must be greater than 0. This number represents the increase in quantity, to be added to the existing quantity.
         * - changeDate: string. It can be omitted. If present, it must be a valid date in the format YYYY-MM-DD that is not after the current date and is after the arrival date of the product.
         * It returns the new quantity of the product.
         */
        this.router.patch(
            "/:model",
            this.authenticator.isLoggedIn,
            this.authenticator.isAdminOrManager,
            [   check ("model").isString().notEmpty(),
                check("quantity").isNumeric().isInt({ gt: 0 }),
                check("changeDate").isDate({format:"YYYY-MM-DD"}).optional({ nullable: true })
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => this.controller.changeProductQuantity(req.params.model, req.body.quantity, req.body.changeDate)
                .then((quantity: any /**number */) => res.status(200).json({ quantity: quantity }))
                .catch((err) => next(err))
        )

        /**
         * Route for selling a product.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the product model as a request parameter. The model must be a string and cannot be empty, and it must represent an existing product.
         * It requires the following body parameters:
         * - quantity: number. It must be greater than 0. This number represents the quantity of units sold. It must be less than or equal to the available quantity of the product.
         * - sellingDate: string. It can be omitted. If present, it must be a valid date in the format YYYY-MM-DD that is not after the current date and is after the arrival date of the product.
         * It returns the new quantity of the product.
         */
        this.router.patch(
            "/:model/sell",
            this.authenticator.isLoggedIn,
            this.authenticator.isAdminOrManager,
            [   check ("model").isString().notEmpty(),
                check("quantity").isNumeric().isInt({ gt: 0 }),
                check("sellingDate").isDate({format:"YYYY-MM-DD"}).optional({ nullable: true })
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => this.controller.sellProduct(req.params.model, req.body.quantity, req.body.sellingDate)
                .then((quantity: any /**number */) => res.status(200).json({ quantity: quantity }))
                .catch((err) => {
                    console.log(err)
                    next(err)
                })
        )

        /**
         * Route for retrieving all products.
         * It requires the user to be logged in and to be either an admin or a manager
         * It can have the following optional query parameters:
         * - grouping: string. It can be either "category" or "model". If absent, then all products are returned and the other query parameters must also be absent.
         * - category: string. It can only be present if grouping is equal to "category" (in which case it must be present) and, when present, it must be one of "Smartphone", "Laptop", "Appliance".
         * - model: string. It can only be present if grouping is equal to "model" (in which case it must be present and not empty).
         * It returns an array of Product objects.
         */
        this.router.get(
            "/",
            query("grouping").optional().isString().isIn(["category", "model"]).withMessage("Grouping should be category or model"),
            query("category").optional().isString().isIn(["Smartphone", "Laptop", "Appliance"]),
            query("model").optional(),
            this.authenticator.isLoggedIn,
            this.authenticator.isAdminOrManager,
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) =>{ 
                let flag = 0;
                if(req.query.grouping === 'category')
                    {
                        if((req.query.category !== undefined) && (req.query.model === undefined))
                            flag = 1
                        else
                            res.status(422).json({msg: "grouping is category and category is null or model not null"})
                    }
                else if(req.query.grouping === 'model')
                    {
                        if((req.query.model !== undefined) && ((req.query.category === undefined)))
                            flag = 1
                        else 
                            res.status(422).json({msg: "grouping is model and model is null or category not null"})
                    }
                else
                {
                        if((req.query.category !== undefined) || (req.query.model !== undefined))
                            res.status(422).json({msg: "grouping is null but category or model are not"})
                        else
                            flag = 1
                }

                if(flag){
                    this.controller.getProducts(req.query.grouping, req.query.category, req.query.model)
                    .then((products: any /*Product[]*/) => res.status(200).json(products))
                    .catch((err) => {
                        next(err)
                    })
                }
            }
        )


        /**
         * Route for retrieving all available products.
         * It requires the user to be logged in.
         * It can have the following optional query parameters:
         * - grouping: string. It can be either "category" or "model". If absent, then all products are returned and the other query parameters must also be absent.
         * - category: string. It can only be present if grouping is equal to "category" (in which case it must be present) and, when present, it must be one of "Smartphone", "Laptop", "Appliance".
         * - model: string. It can only be present if grouping is equal to "model" (in which case it must be present and not empty).
         * It returns an array of Product objects.
         */
        this.router.get(
            "/available",
            query("grouping").optional().isString().isIn(["category", "model"]).withMessage("Grouping should be category or model"),
            query("category").optional().isString().isIn(["Smartphone", "Laptop", "Appliance"]),
            query("model").optional(),
            this.authenticator.isLoggedIn,
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) =>{ 
                let flag = 0;
                if(req.query.grouping === 'category'){
                    if((req.query.category !== undefined) && (req.query.model === undefined))
                        flag = 1
                    else
                        res.status(422).json({msg: "grouping is category and category is null or model not null"})
                }else if(req.query.grouping === 'model'){
                    if((req.query.model !== undefined) && ((req.query.category === undefined)))
                        flag = 1
                    else
                        res.status(422).json({msg: "grouping is model and model is null or category not null"})
                }else{
                    if((req.query.category !== undefined) ||  (req.query.model !== undefined))
                        res.status(422).json({msg: "grouping is null but cateroy or model are not"})
                    else
                        flag = 1
                }
                if(flag){
                    this.controller.getAvailableProducts(req.query.grouping, req.query.category, req.query.model)
                    .then((products: any/*Product[]*/) => res.status(200).json(products))
                    .catch((err) => next(err))
                }
            }
        )

        /**
         * Route for deleting all products.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It returns a 200 status code.
         */
        this.router.delete(
            "/",
            this.authenticator.isLoggedIn,
            this.authenticator.isAdminOrManager,
            (req: any, res: any, next: any) => this.controller.deleteAllProducts()
                .then(() => res.status(200).end())
                .catch((err: any) => next(err))
        )

        /**
         * Route for deleting a product.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the product model as a request parameter. The model must be a string and cannot be empty, and it must represent an existing product.
         * It returns a 200 status code.
         */
        this.router.delete(
            "/:model",
            this.authenticator.isLoggedIn,
            this.authenticator.isAdminOrManager,
            (req: any, res: any, next: any) => this.controller.deleteProduct(req.params.model)
                .then(() => res.status(200).end())
                .catch((err: any) => next(err))
        )


    }
}

export default ProductRoutes
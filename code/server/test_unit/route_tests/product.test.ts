import { describe, test, expect, beforeAll, afterAll, afterEach, jest } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import ProductController from "../../src/controllers/productController";
import { Product } from "../../src/components/product";
import { Category } from "../../src/components/product";
import { cleanup } from "../../src/db/cleanup"
import { userInfo } from "os";
import exp from "constants";
import { group } from "console";
import e from "express";
import { ArrivalAfterCurrentError, ChangeAfterCurrentError, ChangeBeforeArrivalError, EmptyProductStockError, InvalidInput, LowProductStockError, ProductAlreadyExistsError, ProductNotFoundError, ProductSoldError, SellingAfterCurrentError, SellingBeforeArrivalError } from "../../src/errors/productError";
import { Role } from "../../src/components/user";
import { beforeEach } from "node:test";
const baseURL = "/ezelectronics"

jest.mock("../../src/controllers/productController");
const customer = { username: "customer", name: "customer", surname: "customer", password: "1234", role: Role.CUSTOMER };
const manager = { username: "manager", name: "manager", surname: "manager", password: "1234", role: Role.MANAGER };

describe('ProductRoutes', () => {
    const postUser = async (userInfo: any) => {
        await request(app)
            .post(baseURL + '/users')
            .send(userInfo)
            .expect(200)
    }

    const login = async (userInfo: any) => {
        return new Promise<string>((resolve, reject) => {
            request(app)
                .post(baseURL + '/sessions')
                .send(userInfo)
                .end((err, res) => {
                    if (err) {
                        reject(err)
                    }
                    if(res.status === 200)
                        resolve(res.header["set-cookie"][0])
                    else
                        resolve("")
                })
        })
    }

    beforeAll(async () => {
        postUser(customer)
        postUser(manager)
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        cleanup()
    })
/*********************************REGISTRER PRODUCTS******************************/
    describe('Register Products', () => {
        test('It should return a 200 success code if a product is registered from Manager', async() => {
            const testProduct = {
                model: "model1",
                category: Category.LAPTOP,
                quantity: 10,
                details: "test",
                sellingPrice: 200,
                arrivalDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "registerProducts").mockResolvedValueOnce(undefined)

            const response = await request(app).post(baseURL + "/products").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.registerProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.registerProducts).toHaveBeenCalledWith(
                testProduct.model,
                testProduct.category,
                testProduct.quantity,
                testProduct.details,
                testProduct.sellingPrice,
                testProduct.arrivalDate
            )
        })
        test ('It should return a 401 error code if a product is registered from Customer', async() => {
            const testProduct = {
                model: "model1",
                category: Category.LAPTOP,
                quantity: 10,
                details: "test",
                sellingPrice: 200,
                arrivalDate: "2021-01-01"
            }
            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "registerProducts").mockResolvedValueOnce(undefined)

            const response = await request(app).post(baseURL + "/products").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(401)
        });
        test("It should return a 401 error code if a product is registered without being logged in", async() => {
            const testProduct = {
                model: "model1",
                category: Category.LAPTOP,
                quantity: 10,
                details: "test",
                sellingPrice: 200,
                arrivalDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "registerProducts").mockResolvedValueOnce(undefined)
    
            const response = await request(app).post(baseURL + "/products").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(401)
        });
    
        test("It should return a 409 error code if model represents an already existing ser of products in the database", async() => {
            const testProduct = {
                model: "model1",
                category: Category.LAPTOP,
                quantity: 10,
                details: "test",
                sellingPrice: 200,
                arrivalDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "registerProducts").mockImplementation(() => {
                return Promise.reject(new ProductAlreadyExistsError());
            })
            const response = await request(app).post(baseURL + "/products").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(409)
            expect(response.body).toStrictEqual({error: "The product already exists", status: 409})
        });

        test("It should return a a 400 error code when arrivalDate is after the current date", async() => {
            const testProduct = {
                model: "model1",
                category: Category.LAPTOP,
                quantity: 10,
                details: "test",
                sellingPrice: 200,
                arrivalDate: "2030-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "registerProducts").mockImplementation(() => {
                return Promise.reject(new ArrivalAfterCurrentError());
            })
    
            const response = await request(app).post(baseURL + "/products").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(400)
        });
    })    
    /*********************************CHANGE PRODUCT QUANTITY******************************/
    describe('Change Product quantity', () => {
        test('It should return a 200 success code if a product is update correctly', async() => {
            const testProduct = {
                model: "model",
                quantity: 10,
                changeDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "changeProductQuantity").mockResolvedValueOnce(5)

            const response = await request(app).patch(baseURL + "/products/model").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.changeProductQuantity).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.changeProductQuantity).toHaveBeenCalledWith(
                testProduct.model,
                testProduct.quantity,
                testProduct.changeDate
            )
        })
        test("It should return a a 400 error code when changeDate is after the current date", async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                changeDate: "2030-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "changeProductQuantity").mockImplementation(() => {
                return Promise.reject(new ChangeAfterCurrentError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(400)
        });

        test("It should return a a 400 error code when changeDate is before the arrivalDate", async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                changeDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "changeProductQuantity").mockImplementation(() => {
                return Promise.reject(new ChangeBeforeArrivalError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(400)
        });

        test ('It should return a 404 error code if product is not found', async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                changeDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "changeProductQuantity").mockImplementation(() => {
                return Promise.reject(new ProductNotFoundError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(404)
        });
    })
    /*********************************SELL PRODUCT******************************/
    describe('Sell Product', () => {
        test('It should return a 200 success code if a product is sell correctly', async() => {
            const testProduct = {
                model: "model",
                quantity: 10,
                sellingDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "sellProduct").mockResolvedValueOnce(5)

            const response = await request(app).patch(baseURL + "/products/model/sell").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.sellProduct).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.sellProduct).toHaveBeenCalledWith(
                testProduct.model,
                testProduct.quantity,
                testProduct.sellingDate
            )
        })
        test("It should return a a 400 error code when sellingDate is after the current date", async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                sellingDate: "2030-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "sellProduct").mockImplementation(() => {
                return Promise.reject(new SellingAfterCurrentError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model/sell").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(400)
        });

        test("It should return a a 400 error code when sellingDate is before the arrivalDate", async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                sellingDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }
    
            const cookie = await login(user)
    
            jest.spyOn(ProductController.prototype, "sellProduct").mockImplementation(() => {
                return Promise.reject(new SellingBeforeArrivalError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model/sell").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(400)
        });

        test ('It should return a 404 error code if product is not found', async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                sellingDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "sellProduct").mockImplementation(() => {
                return Promise.reject(new ProductNotFoundError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model/sell").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(404)
        });

        test ('It should return a 409 error code if model represents a product whose available quantity is 0', async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                sellingDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "sellProduct").mockImplementation(() => {
                return Promise.reject(new EmptyProductStockError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model/sell").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(409)
        });

        test ('It should return a 409 error if the available quantity of model is lower than the requested quantity', async() => {
            const testProduct = {
                model: "model1",
                quantity: 10,
                sellingDate: "2021-01-01"
            }
            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "sellProduct").mockImplementation(() => {
                return Promise.reject(new LowProductStockError());
            })
    
            const response = await request(app).patch(baseURL + "/products/model/sell").set('Cookie', cookie).send(testProduct)
            expect(response.status).toBe(409)
        });
    })       
    /*********************************GET PRODUCTS******************************/
    describe('Get Products', () => {
        test('It should return a 200 success code if return all products', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "getProducts").mockResolvedValueOnce([{model: "model1", category: Category.LAPTOP, 
                        quantity: 10, details: "test", sellingPrice: 200, arrivalDate: "2021-01-01"}])

            const response = await request(app).get(baseURL + "/products").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.getProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.getProducts).toHaveBeenCalledWith(undefined, undefined, undefined)
        })

        test('It should return a 200 success code if return all products by category', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "getProducts").mockResolvedValueOnce([{model: "model1", category: Category.LAPTOP, 
                        quantity: 10, details: "test", sellingPrice: 200, arrivalDate: "2021-01-01"}])

            const response = await request(app).get(baseURL + "/products?grouping=category&category=Laptop").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.getProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.getProducts).toHaveBeenCalledWith("category", Category.LAPTOP, undefined)
        })

        test('It should return a 200 success code if return all products by model', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "getProducts").mockResolvedValueOnce([{model: "model", category: Category.LAPTOP, 
                        quantity: 10, details: "test", sellingPrice: 200, arrivalDate: "2021-01-01"}])

            const response = await request(app).get(baseURL + "/products?grouping=model&model=model").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.getProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.getProducts).toHaveBeenCalledWith("model", undefined, "model")
        })

        test('It should return a 422 error if grouping is category and category is null OR model is not null', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            const response = await request(app).get(baseURL + "/products?grouping=category").set('Cookie', cookie)
            expect(response.status).toBe(422)
        })

        test('It should return a 422 error if grouping is model and model is null OR category is not null', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            const response = await request(app).get(baseURL + "/products?grouping=model").set('Cookie', cookie)
            expect(response.status).toBe(422)
        })
        
        test('It should return a 422 error if grouping is null and any of category or model is not null', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            const response = await request(app).get(baseURL + "/products?model=model").set('Cookie', cookie)
            expect(response.status).toBe(422)
        })

        test('It should return 503 if there is a database error during product retrieval', async () => {
            const user = {
                username: "manager",
                password: "1234"
            }
            const cookie = await login(user)
            jest.spyOn(ProductController.prototype, "getProducts").mockImplementationOnce(() => {
                return Promise.reject(new Error())
            })
            const response = await request(app).get(baseURL + "/products").set('Cookie', cookie)
            expect(response.status).toBe(503)
            expect(response.body.error).toBe("Internal Server Error")
        })

    })    
    
    /*********************************GET AVAILABLE PRODUCTS******************************/
    describe('Get Available Products', () => {
        test('It should return a 200 success code if return all products', async() => {

            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "getAvailableProducts").mockResolvedValueOnce([{model: "model1", category: Category.LAPTOP, 
                        quantity: 10, details: "test", sellingPrice: 200, arrivalDate: "2021-01-01"}])

            const response = await request(app).get(baseURL + "/products/available").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledWith(undefined, undefined, undefined)
        })

        test('It should return a 200 success code if return all products by category', async() => {

            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "getAvailableProducts").mockResolvedValueOnce([{model: "model1", category: Category.LAPTOP, 
                        quantity: 10, details: "test", sellingPrice: 200, arrivalDate: "2021-01-01"}])

            const response = await request(app).get(baseURL + "/products/available?grouping=category&category=Laptop").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledWith("category", Category.LAPTOP, undefined)
        })

        test('It should return a 200 success code if return all products by model', async() => {

            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "getAvailableProducts").mockResolvedValueOnce([{model: "model", category: Category.LAPTOP, 
                        quantity: 10, details: "test", sellingPrice: 200, arrivalDate: "2021-01-01"}])

            const response = await request(app).get(baseURL + "/products/available?grouping=model&model=model").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledWith("model", undefined, "model")
        })

        test('It should return a 422 error if grouping is category and category is null OR model is not null', async() => {

            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            const response = await request(app).get(baseURL + "/products/available?grouping=category").set('Cookie', cookie)
            expect(response.status).toBe(422)
        })

        test('It should return a 422 error if grouping is model and model is null OR category is not null', async() => {

            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            const response = await request(app).get(baseURL + "/products/available?grouping=model").set('Cookie', cookie)
            expect(response.status).toBe(422)
        })
        
        test('It should return a 422 error if grouping is null and any of category or model is not null', async() => {

            const user = {
                username: "customer",
                password: "1234"
            }

            const cookie = await login(user)

            const response = await request(app).get(baseURL + "/products/available?model=model").set('Cookie', cookie)
            expect(response.status).toBe(422)
        })

        test('It should return 503 if there is a database error during product retrieval', async () => {
            const user = {
                username: "customer",
                password: "1234"
            }
            const cookie = await login(user)
            jest.spyOn(ProductController.prototype, "getAvailableProducts").mockImplementationOnce(() => {
                return Promise.reject(new Error())
            })
            const response = await request(app).get(baseURL + "/products/available").set('Cookie', cookie)
            expect(response.status).toBe(503)
            expect(response.body.error).toBe("Internal Server Error")
        })

    })    

    /*********************************DELETE PRODUCT******************************/
    describe('Delete Product', () => {
        test('It should return a 200 success code if return all products', async() => {

            const testProduct = 
            {
                model: "model1"
            }

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "deleteProduct").mockResolvedValueOnce(true)

            const response = await request(app).delete(baseURL + "/products/" + testProduct.model).set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.deleteProduct).toHaveBeenCalledTimes(1)
            expect(ProductController.prototype.deleteProduct).toHaveBeenCalledWith(testProduct.model)
        })

        test('It should return a 404 error if model does not represent a product in the database', async() => {

            const testProduct = 
            {
                model: "noModel"
            }

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "deleteProduct").mockImplementation(() => {
                return Promise.reject(new ProductNotFoundError());
            })

            const response = await request(app).delete(baseURL + "/products/" + testProduct.model).set('Cookie', cookie)
            expect(response.status).toBe(404)
        })
    })    

    /*********************************DELETE ALL PRODUCTS******************************/
    describe('Delete All Products', () => {
        test('It should return a 200 success code if return all products', async() => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)

            jest.spyOn(ProductController.prototype, "deleteAllProducts").mockResolvedValueOnce(true)

            const response = await request(app).delete(baseURL + "/products").set('Cookie', cookie)
            expect(response.status).toBe(200)

            expect(ProductController.prototype.deleteAllProducts).toHaveBeenCalledTimes(1)
        })

        test('should return 500 if there is a database error during deletion', async () => {

            const user = {
                username: "manager",
                password: "1234"
            }

            const cookie = await login(user)
            jest.spyOn(ProductController.prototype, "deleteAllProducts").mockImplementationOnce(() => {
                return Promise.reject(new Error("Database error"))
            })

            const response = await request(app).delete(baseURL + "/products").set('Cookie', cookie)
            expect(response.status).toBe(503)

        })
    })    
})
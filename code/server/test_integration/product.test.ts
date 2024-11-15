import { describe, test, expect, beforeAll, afterAll, afterEach, beforeEach } from "@jest/globals";
import request from 'supertest'
import { Role } from "../src/components/user";
import { app } from "../index"
import { cleanup } from '../src/db/cleanup';
import { ProductInCart, Cart } from "../src/components/cart";
import { Category } from "../src/components/product";
import e, { response } from "express";
import exp from "node:constants";
import db from "../src/db/db";
import { ProductAlreadyExistsError } from "../src/errors/productError";

const baseURL = "/ezelectronics"

//Default user information. We use them to create users and evaluate the returned values
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role: "Customer" }
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: "Admin" }
//Cookies for the users. We use them to keep users logged in. Creating them once and saving them in a variables outside of the tests will make cookies reusable
let customerCookie: string
let adminCookie: string

//Helper function that creates a new user in the database.
//Can be used to create a user before the tests or in the tests
//Is an implicit test because it checks if the return code is successful
const postUser = async (userInfo: any) => {
    await request(app)
        .post(baseURL + '/users')
        .send(userInfo)
        .expect(200)
}

//Helper function that logs in a user and returns the cookie
//Can be used to log in a user before the tests or in the tests
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

beforeEach(async () => {
    cleanup(); // Pulisce il database prima di ogni test
    await postUser(customer); // Crea un nuovo utente cliente
    customerCookie = await login(customer); // Effettua il login e ottiene il cookie
    await postUser(admin); // Crea un nuovo utente amministratore
    adminCookie = await login(admin); // Effettua il login e ottiene il cookie
});

afterEach(() => {
    cleanup(); // Pulisce il database dopo ogni test
});

describe("Product tests", () => {
    /*********************************REGISTRER PRODUCTS******************************/
    describe("POST/products", () => {
        const testProduct = { 
            model: "test",  
            category: Category.SMARTPHONE,
            quantity: 10,
            details: "test",
            sellingPrice: 1000,
            arrivalDate : "2024-01-01"
        }

        test("Should register a new product", async () => {

            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            const response = 
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);
            expect(response.body).toEqual({})
        })
        test("Should not register a new product if the user is customer", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
                }

            const response = 
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', customerCookie)
            .send(testProduct)
            .expect(401);
        })
        test("It should return a 409 error if model represents an already existing set of products in the database", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
                }

            const response = 
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const errorTestProduct = {
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            const errorResponse = 
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(errorTestProduct)
            .expect(409);
        })
        test("It should return a 422 error if the model is missing", async () => {

            const testProduct = { 
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
                }

            const response = 
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(422);
        })
        test("It should return a 422 error if the category is missing", async () => {
                
                const testProduct = { 
                    model: "test",  
                    quantity: 10,
                    details: "test",
                    sellingPrice: 1000,
                    arrivalDate : "2024-01-01"
                    }
    
                const response = 
                await request(app)
                .post(`${baseURL}/products`)
                .set('Cookie', adminCookie)
                .send(testProduct)
                .expect(422);
        })
        test("It should return a 422 error if the quantity is missing", async () => {
                    
                    const testProduct = { 
                        model: "test",  
                        category: Category.SMARTPHONE,
                        details: "test",
                        sellingPrice: 1000,
                        arrivalDate : "2024-01-01"
                        }
        
                    const response = 
                    await request(app)
                    .post(`${baseURL}/products`)
                    .set('Cookie', adminCookie)
                    .send(testProduct)
                    .expect(422);
        })
        test("It should return a 422 error if quantity is less than 0", async () => {
                            
                            const testProduct = { 
                                model: "test",  
                                category: Category.SMARTPHONE,
                                quantity: -1,
                                details: "test",
                                sellingPrice: 1000,
                                arrivalDate : "2024-01-01"
                                }
                
                            const response = 
                            await request(app)
                            .post(`${baseURL}/products`)
                            .set('Cookie', adminCookie)
                            .send(testProduct)
                            .expect(422);
        })
        test("It should return a 422 error if SellingPrice is missing", async () => {
                                    
                                    const testProduct = { 
                                        model: "test",  
                                        category: Category.SMARTPHONE,
                                        quantity: 10,
                                        details: "test",
                                        arrivalDate : "2024-01-01"
                                        }
                        
                                    const response = 
                                    await request(app)
                                    .post(`${baseURL}/products`)
                                    .set('Cookie', adminCookie)
                                    .send(testProduct)
                                    .expect(422);
        })
        test("It should return a 422 error if SellingPrice is less than 0", async () => {
                                            
                                            const testProduct = { 
                                                model: "test",  
                                                category: Category.SMARTPHONE,
                                                quantity: 10,
                                                details: "test",
                                                sellingPrice: -1,
                                                arrivalDate : "2024-01-01"
                                                }
                                
                                            const response = 
                                            await request(app)
                                            .post(`${baseURL}/products`)
                                            .set('Cookie', adminCookie)
                                            .send(testProduct)
                                            .expect(422);       
        })
        test("It should return a 400 error when arrivalDate is after currentDate", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2030-01-01"
                }

            const response = 
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(400);
        })
    })
    /*********************************CHANGE PRODUCT QUANTITY******************************/
    describe("PATCH/products/:model", () => {
        test("Should change the quantity of a product", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test`)
            .set('Cookie', adminCookie)
            .send({quantity: 20})
            .expect(200);
        })
        test("Should not change the quantity of a product if the user is customer", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test`)
            .set('Cookie', customerCookie)
            .send({quantity: 20})
            .expect(401);
        })
        test("It should return a 404 error if model does not represent a product in the database", async () => {
            const response = 
            await request(app)
            .patch(`${baseURL}/products/test`)
            .set('Cookie', adminCookie)
            .send({quantity: 20})
            .expect(404);
        })
        test("It should return a 400 error if changeDate is after the current date", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);
 

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test`)
            .set('Cookie', adminCookie)
            .send({quantity: 20, changeDate: "2030-01-02"})
            .expect(400);
        })
        test("It should return a 400 error if changeDate is before the product's arrivalDate", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test`)
            .set('Cookie', adminCookie)
            .send({quantity: 20, changeDate: "2021-01-02"})
            .expect(400);
        })
    })
    /*********************************SELL PRODUCT******************************/
    describe("PATCH/products/:model/sell", () => {
        test("Should sell a product", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test/sell`)
            .set('Cookie', adminCookie)
            .send({quantity: 5})
            .expect(200);
        })
        test("Should not sell a product if the user is customer", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test/sell`)
            .set('Cookie', customerCookie)
            .send({quantity: 5})
            .expect(401);
        })
        test("It should return a 404 error if model does not represent a product in the database", async () => {
            const response = 
            await request(app)
            .patch(`${baseURL}/products/test/sell`)
            .set('Cookie', adminCookie)
            .send({quantity: 20})
            .expect(404);
        })
        test("It should return a 400 error if sellingDate is after the current date", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);
 

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test/sell`)
            .set('Cookie', adminCookie)
            .send({quantity: 20, sellingDate: "2030-01-02"})
            .expect(400);
        })
        test("It should return a 400 error if sellingDate is before the product's arrivalDate", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 10,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test/sell`)
            .set('Cookie', adminCookie)
            .send({quantity: 5, sellingDate: "2021-01-02"})
            .expect(400);
        })
        
        test("It should return a 409 error if the available quantity of model is lower than the requested quantity", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = 
            await request(app)
            .patch(`${baseURL}/products/test/sell`)
            .set('Cookie', adminCookie)
            .send({quantity: 10})
            .expect(409);
        })
    })
    /*********************************GET PRODUCTS******************************/
    describe("GET/products", () => {
        test("Should return all product by Admin or Manager", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .expect(200)
            expect(response.body).toEqual([testProduct]);

        })
        test("Should return error by Customer", async () => {
            
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', customerCookie)
            .expect(401);
        })
        test("It should return a 422 error if grouping is null and any of category or model is not null", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products?model=test`)
            .set('Cookie', adminCookie)
            .expect(422)
        })
        test("It should return a 422 error if grouping is category and category is null OR model is not null", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products?grouping=category`)
            .set('Cookie', adminCookie)
            .expect(422)
        })
        test("It should return a 422 error if grouping is model and model is null OR category is not null", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products?grouping=model`)
            .set('Cookie', adminCookie)
            .expect(422)
        })
        test("It should return a 404 error if model does not represent a product in the database (only when grouping is model)", async() => 
        {

                const response = await request(app)
                .get(`${baseURL}/products?grouping=model&model=wrong`)
                .set('Cookie', adminCookie)
                .expect(404)
        })
    })
    /*********************************GET AVAILABLE PRODUCTS******************************/
    describe("GET/products/available", () => {
        test("Should return all product by User", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products/available`)
            .set('Cookie', adminCookie)
            .expect(200)
            expect(response.body).toEqual([testProduct]);

        })
        
        test("It should return a 422 error if grouping is null and any of category or model is not null", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products/available?model=test`)
            .set('Cookie', adminCookie)
            .expect(422)
        })
        test("It should return a 422 error if grouping is category and category is null OR model is not null", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products/available?grouping=category`)
            .set('Cookie', adminCookie)
            .expect(422)
        })
        test("It should return a 422 error if grouping is model and model is null OR category is not null", async() => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .get(`${baseURL}/products/available?grouping=model`)
            .set('Cookie', adminCookie)
            .expect(422)
        })
        test("It should return a 404 error if model does not represent a product in the database (only when grouping is model)", async() => 
        {

                const response = await request(app)
                .get(`${baseURL}/products/available?grouping=model&model=wrong`)
                .set('Cookie', adminCookie)
                .expect(404)
        })
    })
    /*********************************DELETE PRODUCT******************************/
    describe("DELETE/products/:model", () => {
        test("Should delete a product", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .delete(`${baseURL}/products/test`)
            .set('Cookie', adminCookie)
            .expect(200)
        })
        test("Should not delete a product if the user is customer", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            const response = await request(app)
            .delete(`${baseURL}/products/test`)
            .set('Cookie', customerCookie)
            .expect(401)
        })
        test("It should return a 404 error if model does not represent a product in the database", async () => 
        {
            const response = await request(app)
            .delete(`${baseURL}/products/test`)
            .set('Cookie', adminCookie)
            .expect(404)
        })
    })
    /*********************************DELETE ALL PRODUCTS******************************/
    describe("DELETE/products", () => {
        test("Should delete all products", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }
            const testProduct2 = { 
                model: "test2",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct2)
            .expect(200);

            const response = await request(app)
            .delete(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .expect(200)
        })
        test("Should not delete all products if the user is customer", async () => {
            const testProduct = { 
                model: "test",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }
            const testProduct2 = { 
                model: "test2",  
                category: Category.SMARTPHONE,
                quantity: 5,
                details: "test",
                sellingPrice: 1000,
                arrivalDate : "2024-01-01"
            }
            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct)
            .expect(200);

            await request(app)
            .post(`${baseURL}/products`)
            .set('Cookie', adminCookie)
            .send(testProduct2)
            .expect(200);

            const response = await request(app)
            .delete(`${baseURL}/products`)
            .set('Cookie', customerCookie)
            .expect(401)
        })
    })
})

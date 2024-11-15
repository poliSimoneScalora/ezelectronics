import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from "@jest/globals";
import request from 'supertest';
import { app } from "../index";
import db from "../src/db/db";
import { cleanup } from "../src/db/cleanup";
import UserDAO from "../src/dao/userDAO";
import CartDAO from "../src/dao/cartDAO";
import { Role, User } from "../src/components/user";
import { Product, Category } from '../src/components/product'
import { Cart, ProductInCart } from "../src/components/cart";
import { CartNotFoundError, EmptyCartError, ProductQuantityError } from "../src/errors/cartError";
import { EmptyProductStockError, ProductNotFoundError } from "../src/errors/productError";
import  ProductDAO  from "../src/dao/productDAO";
import dayjs from "dayjs";


const productDAO = new ProductDAO();
const userDAO = new UserDAO();
const cartDAO = new CartDAO();

const baseURL = "/ezelectronics"

const adminInfo = {
    username: "Admin",
    name: "test",
    surname: "test",
    password: "test",
    role: Role.ADMIN
}

const adminCredentials = {
    username: "Admin",
    password: "test"
}

const managerInfo = {
    username: "Manager",
    name: "test",
    surname: "test",
    password: "test",
    role: Role.MANAGER
}

const managerCredentials = {
    username: "Manager",
    password: "test"
}

const customerInfo = {
    username: "Customer",
    name: "test",
    surname: "test",
    password: "test",
    role: Role.CUSTOMER
}

const customerCredentials = {
    username: "Customer",
    password: "test"
}

const productM1Info = {
    model: "m1",
    category: Category.SMARTPHONE,
    details: "",
    price: 30.0,
    arrivalDate: "2020-02-02"
}

const productM2Info = {
    model: "m2",
    category: Category.LAPTOP,
    details: "",
    price: 20.0,
    arrivalDate: "2020-02-02"
}

const productM3Info = {
    model: "m3",
    category: Category.APPLIANCE,
    details: "",
    price: 10.0,
    arrivalDate: "2020-02-02"
}

const postUser = async (userInfo: any) => {
    await request(app)
        .post(`${baseURL}/users`)
        .send(userInfo)
        .expect(200)
}

const login = async (credentials: any) => {
    return new Promise<string>((resolve, reject) => {
        request(app)
            .post(`${baseURL}/sessions`)
            .send(credentials)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    reject(err)
                }
                resolve(res.header["set-cookie"])
            })
    })
}

const userDao = new UserDAO();
let customerSessionId: any;
let adminSessionId: any;
let managerSessionId: any;

async function createUsers() {
    await userDao.createUser("customer", "test", "test", "test", Role.CUSTOMER)
    await userDao.createUser("admin", "test", "test", "test", Role.ADMIN)
    await userDao.createUser("manager", "test", "test", "test", Role.MANAGER)
}

beforeEach(async () => {
    await cleanup()
    await createUsers()
    jest.clearAllMocks();
    });

beforeAll(async () => {
   
        await cleanup()
        await createUsers()
        const customerResponse = await request(app).post(`${baseURL}/sessions`).send({
            username: "customer",
            password: "test"
        })

        const adminResponse = await request(app).post(`${baseURL}/sessions`).send({
            username: "admin",
            password: "test"
        })
        const managerResponse = await request(app).post(`${baseURL}/sessions`).send({
            username: "manager",
            password: "test"
        })
        let customerSessionId = customerResponse.headers['set-cookie'];
        let adminSessionId = adminResponse.headers['set-cookie'];
        let managerSessionId = managerResponse.headers['set-cookie'];
    
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(async () => {
    await cleanup();
    await db.close();
});

const createProduct = async (productInfo: any, quantity: number) => {
    return new Promise<boolean>((resolve, reject) => {
        const sql = "INSERT INTO Product(model, category, quantity, details, sellingPrice, arrivalDate) VALUES(?, ?, ?, ?, ?, ?)";
        db.run(sql, [productInfo.model, productInfo.category, quantity, productInfo.details, productInfo.price, productInfo.arrivalDate], (err) => {
            if(err)
                reject(err)
            else
                resolve(true);
        });
    })
}

const getProductInfo = async (model: string) => {
    return new Promise<any>((resolve, reject) => {
        const sql = "SELECT * FROM Product WHERE model = ?";
        db.get(sql, [model], (err, row) => {
            if(err)
                reject(err);
            else
                resolve(row);
        })
    })
}

const createCart = async (username: string) => {
    return new Promise<number>((resolve, reject) => {
        const sql = "INSERT INTO Cart(customer, paid, paymentDate, total) VALUES(?, 0, null, 0.0)";
        db.run(sql, [username], function(err){
            if(err)
                reject(err);
            else
                resolve(this.lastID)
        })
    })
}

const getCartInfo = async (cartId: number) => {
    return new Promise<any>((resolve, reject) => {
        const sql = "SELECT * FROM Cart WHERE cartId = ?";
        db.get(sql, [cartId], (err, row) => {
            if(err)
                reject(err);
            else
                resolve(row);
        })
    })
}

const setCartAsPaid = async (cartId: number, paymentDate: string) => {
    return new Promise<boolean>((resolve, reject) => {
        const sql = "UPDATE Cart SET paid = 1, paymentDate = ? WHERE cartId = ?";
        db.run(sql, [paymentDate, cartId], (err) => {
            if(err)
                reject(err);
            else
                resolve(true);
        });3
    })
}

const getAllCarts = async () => {
    return new Promise<any[]>((resolve, reject) => {
        const sql = "SELECT * FROM Cart";
        db.all(sql, (err, rows) => {
            if(err)
                reject(err);
            else
                resolve(rows);
        })
    })
}

const addProductToExistingCartThatNotContainsIt = async (cartId: number, productInfo: any) => {
    return new Promise<boolean>((resolve, reject) => {
        const sql = "INSERT INTO ProductInCart(cartId, model, quantity, category, price) VALUES(?, ?, ?, ?, ?)";
        db.run(sql, [cartId, productInfo.model, 1, productInfo.category, productInfo.price], (err) => {
            if(err)
                reject(err)
            else{
                const sql1 = "UPDATE Cart SET total = total + ? WHERE cartId = ?";
                db.run(sql1, [productInfo.price, cartId], (err) => {
                    if(err)
                        reject(err);
                    else
                        resolve(true);
                })
            }
        })
    })
}

const addProductToExistingCartThatAlreadyContainsIt = async (cartId: number, productInfo: any) => {
    return new Promise<boolean>((resolve, reject) => {
        const sql = "UPDATE ProductInCart SET quantity = quantity + 1, price = price + ? WHERE cartId = ? AND model = ?";
        db.run(sql, [productInfo.price, cartId, productInfo.model], (err) => {
            if(err)
                reject(err)
            else{
                const sql1 = "UPDATE Cart SET total = total + ? WHERE cartId = ?";
                db.run(sql1, [productInfo.price, cartId], (err) => {
                    if(err)
                        reject(err);
                    else
                        resolve(true);
                })
            }
        })
    })
}

const getProductsInCart = async (cartId: number) => {
    return new Promise<any[]>((resolve, reject) => {
        const sql = "SELECT * FROM ProductInCart WHERE cartId = ?";
        db.all(sql, [cartId], (err, rows) => {
            if(err)
                reject(err);
            else
                resolve(rows);
        })
    })
}

const getCurrentCartOfCustomer = async (username: string) => {
    return new Promise<any>((resolve, reject) => {
        const sql = "SELECT cartId FROM Cart WHERE customer = ? AND paid = 0";
        db.get(sql, [username], (err, row) => {
            if(err)
                reject(err)
            else if(!row)
                resolve(-1);
            else
                resolve(row);
        })
    })
}

describe("Cart routes integration tests", () => {
    describe("test GET ezelectronics/carts", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Get current cart that exists and contains products", async () => {
            // devo prima inserire i dati nel db (Condizioni iniziali)
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 2);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);
            await addProductToExistingCartThatAlreadyContainsIt(cartId, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).get(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            expect(response.body.customer).toBe(customerInfo.username);
            expect(response.body.paid).toBe(0);
            expect(response.body.paymentDate).toBe(null);
            expect(response.body.total).toBe(productM1Info.price + productM2Info.price + productM2Info.price);
            expect(response.body.products).toHaveLength(2);
        })

        test("Get current cart that exists and is empty", async () => {
            // devo prima inserire i dati nel db (Condizioni iniziali)
            await postUser(customerInfo);
            const cartId = await createCart(customerInfo.username);
            
            const cookie = await login(customerCredentials);
            const response = await request(app).get(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            expect(response.body.customer).toBe(customerInfo.username);
            expect(response.body.paid).toBe(0);
            expect(response.body.paymentDate).toBe(null);
            expect(response.body.total).toBe(0.0);
            expect(response.body.products).toHaveLength(0);
        })

        test("Get current cart that not exists", async () => {
            // devo prima inserire i dati nel db (Condizioni iniziali)
            await postUser(customerInfo);
            
            const cookie = await login(customerCredentials);
            const response = await request(app).get(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            expect(response.body.customer).toBe(customerInfo.username);
            expect(response.body.paid).toBe(false);
            expect(response.body.paymentDate).toBe("");
            expect(response.body.total).toBe(0.0);
            expect(response.body.products).toHaveLength(0);
        })

        test("Get current cart by a not authenticated user", async () => {
            // devo prima inserire i dati nel db (Condizioni iniziali)
            await postUser(customerInfo);
            
            const response = await request(app).get(`${baseURL}/carts`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Get current cart by a not customer user", async () => {
            // devo prima inserire i dati nel db (Condizioni iniziali)
            await postUser(managerInfo);
            
            const cookie = await login(managerCredentials);
            const response = await request(app).get(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not a customer");
        })
    })

    describe("test POST ezelectronics/carts", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Add an existing product to an existing cart that doesn't constain it", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            const cartId = await createCart(customerInfo.username);
            const requestBody = {model: productM1Info.model}
            
            const cookie = await login(customerCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const productsInCart = await getProductsInCart(cartId);
            expect(productsInCart).toHaveLength(1);
            expect(productsInCart[0].model).toBe(productM1Info.model)
            expect(productsInCart[0].quantity).toBe(1);
            const cartInfo = await getCartInfo(cartId);
            expect(cartInfo.total).toBe(productM1Info.price)
        })

        test("Add an existing product to an existing cart that already constains it", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            const requestBody = {model: productM1Info.model}
            
            const cookie = await login(customerCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const productsInCart = await getProductsInCart(cartId);
            expect(productsInCart).toHaveLength(1);
            expect(productsInCart[0].model).toBe(productM1Info.model)
            expect(productsInCart[0].quantity).toBe(2);
            const cartInfo = await getCartInfo(cartId);
            expect(cartInfo.total).toBe(productM1Info.price + productM1Info.price)
        })

        test("Add an existing product to a not existing cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            const requestBody = {model: productM1Info.model}
            
            const cookie = await login(customerCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const idObject = await getCurrentCartOfCustomer(customerInfo.username);
            expect(idObject).not.toBe(-1);
            const productsInCart = await getProductsInCart(idObject.id);
            expect(productsInCart).toHaveLength(0);
        })

        test("Add a product that not exists to a cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            const requestBody = {model: "invalid"}
            
            const cookie = await login(customerCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Product not found");
        })

        test("Add a product whose model is an empty string to a cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            const requestBody = {model: "   "}
            
            const cookie = await login(customerCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Product not found");
        })

        test("Add a product whose quantity is 0 to a cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 0);
            const requestBody = {model: productM1Info.model};
            
            const cookie = await login(customerCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(409);
            expect(response.body.error).toBe("Product stock is empty");
        })

        test("Add a product whose quantity by a not authenticated user", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            const requestBody = {model: productM1Info.model};
            
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Add a product whose quantity by a not authenticated user", async () => {
            await postUser(adminInfo);
            await createProduct(productM1Info, 1);
            const requestBody = {model: productM1Info.model};
            
            const cookie = await login(adminCredentials)
            const response = await request(app).post(`${baseURL}/carts`).send(requestBody).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not a customer");
        })
    })

    describe("PATCH ezelectronics/carts", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Check out existing cart with products", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 2);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);
            const todayStr = dayjs().format("YYYY-MM-DD");
            

            const cookie = await login(customerCredentials);
            const response = await request(app).patch(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const cartInfo = await getCartInfo(cartId);
            expect(cartInfo.paid).toBe(1);
            expect(cartInfo.paymentDate).toBe(todayStr);
            const productM1InfoUpdated = await getProductInfo(productM1Info.model);
            expect(productM1InfoUpdated.quantity).toBe(0);
            const productM2InfoUpdated = await getProductInfo(productM2Info.model);
            expect(productM2InfoUpdated.quantity).toBe(1);
        })

        test("Check out not existing cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 2);

            const cookie = await login(customerCredentials);
            const response = await request(app).patch(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Cart not found");
        })

        test("Check out empty cart", async () => {
            await postUser(customerInfo);
            await createCart(customerInfo.username);

            const cookie = await login(customerCredentials);
            const response = await request(app).patch(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(400);
            expect(response.body.error).toBe("Cart is empty");
        })

        test("Check out existing cart with that contains a product whose quantity is 0", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 0);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).patch(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(409);
            expect(response.body.error).toBe("Product stock is empty");
        })

        test("Check out existing cart with that contains a product whose quantity is not enough", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);
            await addProductToExistingCartThatAlreadyContainsIt(cartId, productM2Info)
            const today = dayjs().format("YYYY-MM-DD");

            const cookie = await login(customerCredentials);
            const response = await request(app).patch(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(409);
            expect(response.body.error).toBe("Quantity in cart is more than available quantity");
        })

        test("Check out cart by unauthenticated user", async () => {
            const response = await request(app).patch(`${baseURL}/carts`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Check out cart by user that is not a customer", async () => {
            await postUser(managerInfo);

            const cookie = await login(managerCredentials);
            const response = await request(app).patch(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not a customer");
        })
    })

    describe("test GET ezelectronics/carts/history", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Get carts history with 2 paid carts", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 2);
            await createProduct(productM3Info, 2)
            const cartId1 = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId1, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId1, productM2Info);
            
            const todayStr = dayjs().format("YYYY-MM-DD");
            await setCartAsPaid(cartId1, todayStr);
            const cartId2 = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId2, productM2Info);
            await addProductToExistingCartThatNotContainsIt(cartId2, productM3Info);
            await addProductToExistingCartThatAlreadyContainsIt(cartId2, productM3Info);
            await setCartAsPaid(cartId2, todayStr);

            const cookie = await login(customerCredentials);
            const response = await request(app).get(`${baseURL}/carts/history`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].products).toHaveLength(2);
            expect(response.body[0].total).toBe(productM1Info.price + productM2Info.price);
            expect(response.body[1].products).toHaveLength(2);
            expect(response.body[1].total).toBe(productM2Info.price + productM2Info.price + productM3Info.price);
        })

        test("Get carts history with no carts", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 2);
            const cartId1 = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId1, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId1, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).get(`${baseURL}/carts/history`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(0);
        })

        test("Get carts history by an unauthenticated user", async () => {

            const response = await request(app).get(`${baseURL}/carts/history`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Get carts history by user that is not customer", async () => {
            await postUser(adminInfo);

            const cookie = await login(adminCredentials);
            const response = await request(app).get(`${baseURL}/carts/history`).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not a customer");
        })
    })

    describe("test DELETE ezelectronics/carts/products/:model", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Remove an existing product from a cart that contains it", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 2);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);
            await addProductToExistingCartThatAlreadyContainsIt(cartId, productM1Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/${productM1Info.model}`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const cartInfo = await getCartInfo(cartId);
            expect(cartInfo.total).toBe(productM1Info.price + productM2Info.price);
            const productsInCart = await getProductsInCart(cartId);
            expect(productsInCart).toHaveLength(2);
            expect(productsInCart[0].quantity).toBe(1);
            expect(productsInCart[1].quantity).toBe(1);
        })

        test("Remove an existing (last) product from a cart that contains it", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/${productM1Info.model}`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const cartInfo = await getCartInfo(cartId);
            expect(cartInfo.total).toBe(productM2Info.price);
            const productsInCart = await getProductsInCart(cartId);
            expect(productsInCart).toHaveLength(1);
            expect(productsInCart[0].model).toBe(productM2Info.model);
        })

        test("Remove an existing product from a cart that not contains it", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            await createProduct(productM3Info, 1);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/${productM3Info.model}`).set("Cookie", cookie);
            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Product not in cart");
        })

        test("Remove product from an empty cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            await createCart(customerInfo.username);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/${productM1Info.model}`).set("Cookie", cookie);
            expect(response.status).toBe(400);
        })

        test("Remove product from a not cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/${productM1Info.model}`).set("Cookie", cookie);
            expect(response.status).toBe(404);
        })

        test("Remove a not existing product from a cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/invalid`).set("Cookie", cookie);
            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Product not found");
        })

        test("Remove product from a cart by a not authenticated user", async () => {

            const response = await request(app).delete(`${baseURL}/carts/products/${productM1Info.model}`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Remove product from a cart by a user thai is not a customer", async () => {
            await postUser(managerInfo)

            const cookie = await login(managerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/products/${productM1Info.model}`).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not a customer");
        })
    })

    describe("test DELETE ezelectronics/carts/current", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Clear an existing cart", async () => {
            await postUser(customerInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            const cartId = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId, productM2Info);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/current`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const cartInfo = await getCartInfo(cartId);
            expect(cartInfo.total).toBe(0);
        })

        test("Clear a not existing cart", async () => {
            await postUser(customerInfo);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts/current`).set("Cookie", cookie);
            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Cart not found");
        })

        test("Clear a cart by a not authenticated user", async () => {

            const response = await request(app).delete(`${baseURL}/carts/current`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Clear a cart by a user that is not a customer", async () => {
            await postUser(adminInfo);

            const cookie = await login(adminCredentials);
            const response = await request(app).delete(`${baseURL}/carts/current`).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not a customer");
        })
    })

    describe("test DELETE ezelectronics/carts", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        test("Delete all existing cart by admin", async () => {
            await postUser(customerInfo);
            await postUser(adminInfo);
            await createProduct(productM1Info, 1);
            await createProduct(productM2Info, 1);
            await createProduct(productM3Info, 1);
            const cartId1 = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId1, productM1Info);
            await addProductToExistingCartThatNotContainsIt(cartId1, productM2Info);
            
            const todayStr = dayjs().format("YYYY-MM-DD");
            await setCartAsPaid(cartId1, todayStr);
            const cartId2 = await createCart(customerInfo.username);
            await addProductToExistingCartThatNotContainsIt(cartId2, productM3Info);

            const cookie = await login(adminCredentials);
            const response = await request(app).delete(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(200);
            const cartsInfo = await getAllCarts();
            expect(cartsInfo).toHaveLength(0);
        })

        test("Delete all existing cart by a not authenticated user", async () => {
            
            const response = await request(app).delete(`${baseURL}/carts`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })

        test("Delete all existing cart by customer", async () => {
            await postUser(customerInfo);

            const cookie = await login(customerCredentials);
            const response = await request(app).delete(`${baseURL}/carts`).set("Cookie", cookie);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("User is not an admin or manager");
        })
    })

    describe("test GET ezelectronics/carts/all", () => {
        beforeEach(async () => {
            // Esegui la funzione di cleanup per pulire il database prima di ogni test
            await cleanup();
        })

        afterAll(async () => {
            await cleanup();
        
        })

        beforeAll(async () => {
            // Create a cart
            await cleanup()
            await createUsers()
            const customerResponse = await request(app).post(`${baseURL}/sessions`).send({
                username: "customer",
                password: "test"
            })
    
            const adminResponse = await request(app).post(`${baseURL}/sessions`).send({
                username: "admin",
                password: "test"
            })
            const managerResponse = await request(app).post(`${baseURL}/sessions`).send({
                username: "manager",
                password: "test"
            })
            customerSessionId = customerResponse.headers['set-cookie'];
            adminSessionId = adminResponse.headers['set-cookie'];
            managerSessionId = managerResponse.headers['set-cookie'];
    
            
        });

        test("Get all carts by a manager", async () => {
            
            const response = await request(app).get(`${baseURL}/carts/all`);
            expect(response.status).toBe(401);
            expect(response.body.error).toBe("Unauthenticated user");
        })
    })
})






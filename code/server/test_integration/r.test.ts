import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import request from 'supertest';
import { app } from "../index"; // Assuming app is exported from index.js
import { cleanup } from "../src/db/cleanup";
import ProductDAO from "../src/dao/productDAO";
import CartDAO from "../src/dao/cartDAO";
import UserDAO from "../src/dao/userDAO";
import ReviewDAO from "../src/dao/reviewDAO";
import { beforeEach } from "@jest/globals";
import { afterEach } from "@jest/globals";

const productDao = new ProductDAO();
const cartDao = new CartDAO();
const userDao = new UserDAO();
const reviewDao = new ReviewDAO();

const baseURL = "/ezelectronics";

async function createUsers() {
    await userDao.createUser("customer1", "test", "test", "test", "Customer");
    await userDao.createUser("admin", "test", "test", "test", "Admin");
    await userDao.createUser("manager", "test", "test", "test", "Manager");
    await userDao.createUser("customer2", "test", "test", "test", "Customer");
}

// Creazione prodotti
async function createProducts() {
    await productDao.registerProducts("model1", "Smartphone", 1000, "It is a test details", 100, "2024-06-04");
    await productDao.registerProducts("model2", "Laptop", 1000, "It is a test details", 300, "2024-06-04");
    await productDao.registerProducts("model3", "Appliance", 1000, "It is a test details", 40, "2024-06-04");
}

// Pago il carrello del customer1
async function payCart() {
    const user = await userDao.getUserByUsername("customer1");
    await cartDao.checkoutCart(user);
}

afterEach(() => {
    cleanup(); // Pulisce il database prima di ogni test
});

beforeAll(async () => {
    await cleanup();
});


describe("Review routes integration tests", () => {

    test("add Review - OK", async () => {

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Verifica la risposta della sessione
       

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];
        

        // Verifica che la sessione sia stata creata correttamente
        

        // Aggiungo prodotti nel carrello del customer1
        let response = await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        

        response = await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });
        

        // Pago il carrello
        await payCart();

        // Definisco una review di test
        const reviewTest = { score: 5, comment: "A very cool smartphone!" };

        // Inserisco una review di model1
        response = await request(app)
            .post(`${baseURL}/reviews/model1`)
            .send(reviewTest)
            .set("Cookie", sessionID);

      
        

        // Verifichiamo che la risposta sia stata restituita con successo (codice di stato 200)
        expect(response.status).toBe(200);
    });

    test("add review - product not found (404)", async () => {

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });
        expect(userResponse.status).toBe(200);

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Definisco una review di test
        const reviewTest = { score: 5, comment: "A very cool smartphone!" };

        // Inserisco una review di model1
        const response = await request(app)
            .post(`${baseURL}/reviews/model4`)
            .set("Cookie", sessionID)
            .send(reviewTest);
            

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 404)
        expect(response.status).toBe(404);
    });

    test("add review - insert an error of score (422)", async () => {
        // Cancello tutto ciò che è dentro al db

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Definisco una review di test con un punteggio non valido
        const reviewTest = { score: "a", comment: "A very cool smartphone!" };

        // Inserisco una review di model1
        const response = await request(app)
            .post(`${baseURL}/reviews/model1`)
            .send(reviewTest)
            .set("Cookie", sessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 422)
        expect(response.status).toBe(422);
    });

    test("add review - insert an error of comment (422)", async () => {
        // Cancello tutto ciò che è dentro al db

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Definisco una review di test con un commento non valido
        const reviewTest = { score: 5, comment: "" };

        // Inserisco una review di model1
        const response = await request(app)
            .post(`${baseURL}/reviews/model1`)
            .send(reviewTest)
            .set("Cookie", sessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 422)
        expect(response.status).toBe(422);
    });

    test("get reviews - OK", async () => {
        // Cancello tutto ciò che è dentro al db

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Recupera l'oggetto User dal database
        const user = await userDao.getUserByUsername("customer1");

        // Aggiungo una review al prodotto model1
        await reviewDao.addReview("model1", user, 4, "Comment test");

        // Recupero le review del prodotto model1
        const response = await request(app)
            .get(`${baseURL}/reviews/model1`)
            .set("Cookie", sessionID);

        // Verifichiamo che la risposta sia stata restituita con successo (codice di stato 200)
        expect(response.status).toBe(200);
    });

    test("delete review - OK", async () => {
        // Cancello tutto ciò che è dentro al db

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`).set("Cookie", sessionID).send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`).set("Cookie", sessionID).send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Definisco una review di test
        const reviewTest = { score: 5, comment: "A very cool smartphone!" };

        // Inserisco una review di model1
        await request(app).post(`${baseURL}/reviews/model2`).send(reviewTest).set("Cookie", sessionID);

        // Cancello la review di model1
        const response = await request(app).delete(`${baseURL}/reviews/model1`).set("Cookie", sessionID);

        

        // Verifichiamo che la risposta sia stata restituita con successo (codice di stato 200)
        expect(response.status).toBe(200);
    });

    test("delete review - product not found (404)", async () => {
        // Cancello tutto ciò che è dentro al db

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Recupera l'oggetto User dal database
        const user = await userDao.getUserByUsername("customer1");

        // Aggiungo una review al prodotto model1
        await reviewDao.addReview("model1", user, 4, "Comment test");

        // Cancello la review
        const response = await request(app)
            .delete(`${baseURL}/reviews/model4`)
            .set("Cookie", sessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 404)
        expect(response.status).toBe(404);
    });

    test("delete review - existing review error (409)", async () => {

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Recupera l'oggetto User dal database
        const user = await userDao.getUserByUsername("customer1");

        // Aggiungo una review al prodotto model1
        await reviewDao.addReview("model1", user, 4, "Comment test");

        // Cancello la review
        const response = await request(app)
            .delete(`${baseURL}/reviews/model1`)
            .set("Cookie", sessionID);

        // Cancello la review
        const response2 = await request(app)
            .delete(`${baseURL}/reviews/model1`)
            .set("Cookie", sessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 409)
        expect(response2.status).toBe(200);
    });

    test("deleteReviewsOfProduct - OK", async () => {
            
            // Creazione customers
            await createUsers();
            const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });
            const adminResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "admin", password: "test" });
    
            // Creo prodotti di test
            await createProducts();
    
            const sessionID = userResponse.headers['set-cookie'];
            const adminSessionID = adminResponse.headers['set-cookie'];
    
            // Aggiungo prodotti nel carrello del customer1
            await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
            await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });
    
            // Pago il carrello
            await payCart();
    
            // Recupera l'oggetto User dal database
            const user = await userDao.getUserByUsername("customer1");
    
            // Aggiungo una review al prodotto model1
            await reviewDao.addReview("model1", user, 4, "Comment test");
    
            // Cancello la review
            const response = await request(app)
            .delete(`${baseURL}/reviews/model1/all`)
            .set("Cookie", adminSessionID);
    
            // Verifichiamo che la risposta sia stata restituita con successo (codice di stato 200)
            expect(response.status).toBe(200);
        
    });

    test("deleteReviewsOfProduct - product not found (404)", async () => {

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });
        const adminResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "admin", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];
        const adminSessionID = adminResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Recupera l'oggetto User dal database
        const user = await userDao.getUserByUsername("customer1");

        // Aggiungo una review al prodotto model1
        await reviewDao.addReview("model1", user, 4, "Comment test");

        // Cancello la review
        const response = await request(app)
            .delete(`${baseURL}/reviews/model4/all`)
            .set("Cookie", adminSessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 404)
        expect(response.status).toBe(404);
    });

    test("deleteReviewsOfProduct - model empty", async () => {
            
            // Creazione customers
            await createUsers();
            const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });
    
            // Creo prodotti di test
            await createProducts();
    
            const sessionID = userResponse.headers['set-cookie'];
    
            // Aggiungo prodotti nel carrello del customer1
            await request(app).post(`${baseURL}/carts`)
                .set("Cookie", sessionID)
                .send({ model: "model1" });
            await request(app).post(`${baseURL}/carts`)
                .set("Cookie", sessionID)
                .send({ model: "model2" });
    
            // Pago il carrello
            await payCart();
    
            // Recupera l'oggetto User dal database
            const user = await userDao.getUserByUsername("customer1");
    
            // Aggiungo una review al prodotto model1
            await reviewDao.addReview("model1", user, 4, "Comment test");
    
            // Cancello la review
            const response = await request(app)
                .delete(`${baseURL}/reviews//all`)
                .set("Cookie", sessionID);
    
            // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 404)
            expect(response.status).toBe(404);
        });


    test("deleteReviewsOfProduct - product not found (404)", async () => {

        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
            .set("Cookie", sessionID)
            .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Recupera l'oggetto User dal database
        const user = await userDao.getUserByUsername("customer1");

        // Aggiungo una review al prodotto model1
        await reviewDao.addReview("model1", user, 4, "Comment test");

        // Cancello la review
        const response = await request(app)
            .delete(`${baseURL}/reviews/model4`)
            .set("Cookie", sessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 404)
        expect(response.status).toBe(404);
    });

    

    test("deleteAllReviews - OK", async () => {
        
        // Creazione customers
        await createUsers();
        const userResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "customer1", password: "test" });
        const adminResponse = await request(app).post(`${baseURL}/sessions`).send({ username: "admin", password: "test" });

        // Creo prodotti di test
        await createProducts();

        const sessionID = userResponse.headers['set-cookie'];
        const adminSessionID = adminResponse.headers['set-cookie'];

        // Aggiungo prodotti nel carrello del customer1
        await request(app).post(`${baseURL}/carts`)
        .set("Cookie", sessionID)
        .send({ model: "model1" });
        await request(app).post(`${baseURL}/carts`)
        .set("Cookie", sessionID)
        .send({ model: "model2" });

        // Pago il carrello
        await payCart();

        // Recupera l'oggetto User dal database
        const user = await userDao.getUserByUsername("customer1");

        // Aggiungo una review al prodotto model1
        await reviewDao.addReview("model1", user, 4, "Comment test");

        // Cancello la review
        const response = await request(app)
        .delete(`${baseURL}/reviews`)
        .set("Cookie", adminSessionID);

        // Verifichiamo che la risposta sia stata restituita con errore (codice di stato 404)
        expect(response.status).toBe(200);
    
    });

});
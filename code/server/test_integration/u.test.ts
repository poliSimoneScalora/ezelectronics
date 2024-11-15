import { describe, test, expect, beforeAll, afterAll } from "@jest/globals"
import request from 'supertest'
import { app } from "../index"
import db from "../src/db/db"
import { cleanup } from "../src/db/cleanup"
import UserDAO from "../src/dao/userDAO"
import { Role, User } from "../src/components/user"
const baseURL = "/ezelectronics"
const userDAO = new UserDAO();

//CREATE USER:
describe("Create User", () => {
test("Creates a new user with the provided information", async () => {
    await cleanup();
    const testUser = { //Define a test user object sent to the route
        username: "primo",
        name: "primo",
        surname: "primo",
        password: "primo",
        role: "Customer"
    }

    const response = await request(app)
    .post(baseURL + "/users")
    .send(testUser);

    expect(response.status).toBe(200);
}, 10000);

test("Creates a new user with error user already exist - ERROR 409", async () => {
    await cleanup();
    const createUser = await userDAO.createUser("test", "test", "test", "test", "Customer");
    const testUser = { //Define a test user object sent to the route
        username: "test",
        name: "test",
        surname: "test",
        password: "test",
        role: "Customer"
    }

    const response = await request(app)
    .post(baseURL + "/users")
    .send(testUser);

    expect(response.status).toBe(409);
}, 10000);
});

describe("Get User", () => {
    test("Returns the list of all users", async () => {
        await cleanup();
        const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
        const user2 = new User("test1", "test1", "test1", Role.MANAGER, "", "");
        const user3 = new User("testAdmin", "test2", "test2", Role.ADMIN, "", "");
    
        await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
        await userDAO.createUser(user2.username, user2.name, user2.surname, "test1", user2.role);
        await userDAO.createUser(user3.username, user3.name, user3.surname, "test2", user3.role);
        // Creazione di una sessione admin per autenticare la richiesta
        const adminSession = await request(app)
            .post(baseURL+ "/sessions")
            .send({ username: user3.username, password: "test2" });
        const sessionID = adminSession.headers['set-cookie'];
    
        // Effettuare la richiesta per ottenere la lista degli utenti
        const response = await request(app)
            .get(baseURL + "/users/")
            .set("Cookie", sessionID);
    
        const transformedUsers = response.body.map((user: User) => ({
            ...user,
            address: user.address === null ? "" : user.address,
            birthdate: user.birthdate === null ? "" : user.birthdate
        }));
    
        // Verifica della risposta
        expect(response.status).toBe(200);
        expect(transformedUsers).toEqual([
            {
                username: "test",
                name: "test",
                surname: "test",
                role: "Customer",
                address: "",
                birthdate: ""
            },
            {
                username: "test1",
                name: "test1",
                surname: "test1",
                role: "Manager",
                address:"",
                birthdate: ""
            },
            {
                username: "testAdmin",
                name: "test2",
                surname: "test2",
                role: "Admin",
                address: "",
                birthdate: ""
            }
        ]);
    }, 10000);

    test("Returns the list of all users - Error 401 ", async () => {
        await cleanup();
        const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
        const user2 = new User("test1", "test", "test", Role.MANAGER, "", "");
        const user3 = new User("testCustomer-Admin", "test", "test", Role.CUSTOMER, "", "");
        
        await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
    await userDAO.createUser(user2.username, user2.name, user2.surname, "test", user2.role);
    await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
    // Creazione di una sessione admin per autenticare la richiesta
    const adminSession = await request(app)
        .post(baseURL + "/sessions ")
        .send({ username: "testCustomer-Admin", password: "test" });
    const sessionID = adminSession.headers['set-cookie'];

    // Effettuare la richiesta per ottenere la lista degli utenti
    const response = await request(app)
        .get(baseURL +"/users")
        .set("Cookie", sessionID);

    // Verifica della risposta
    expect(response.status).toBe(401);
}, 10000);
});
describe("GetUserByRole", () => {
        test("Returns the list of all users - By Role", async () => {
            await cleanup();
            const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
            const user2 = new User("test1", "test", "test", Role.CUSTOMER, "", "");
            const user3 = new User("testAdmin", "test", "test", Role.ADMIN, "", "");

            await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
            await userDAO.createUser(user2.username, user2.name, user2.surname, "test", user2.role);
            await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL+ "/sessions")
                .send({ username: "testAdmin", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];

            // Effettuare la richiesta per ottenere la lista degli utenti
            const response = await request(app)
                .get(baseURL + "/users/roles/Customer")
                .set("Cookie", sessionID);

            const transformedUsers = response.body.map((user: User) => ({
                ...user,
                address: user.address === null ? "" : user.address,
                birthdate: user.birthdate === null ? "" : user.birthdate
            }));

            // Verifica della risposta
            expect(response.status).toBe(200);
            expect(transformedUsers).toEqual([
                {
                    username: "test",
                    name: "test",
                    surname: "test",
                    role: "Customer",
                    address: "",
                    birthdate: ""
                },
                {
                    username: "test1",
                    name: "test",
                    surname: "test",
                    role: "Customer",
                    address:"",
                    birthdate: ""
                }
            ]);
        }, 10000);
});

    describe("GetUserByUsername", () => {
        test("Returns a single user with a specific username", async () => {
            await cleanup();
            const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
            const user3 = new User("testAdmin", "test", "test", Role.ADMIN, "", "");
        
            await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
            await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
        
            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL +"/sessions")
                .send({ username: "testAdmin", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];
        
            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .get(baseURL+"/users/test")
                .set("Cookie", sessionID);
        
                const transformedUsers = {
                    ...response.body,
                    address: response.body.address === null ? "" : response.body.address,
                    birthdate: response.body.birthdate === null ? "" : response.body.birthdate
                };
        
            // Verifica della risposta
            expect(response.status).toBe(200);
            expect(transformedUsers).toEqual(user1);
        }, 10000);

        test("Returns a single user with a specific username whith username doesn't exist error", async () => {
            await cleanup();
            const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
            const user3 = new User("testAdmin", "test", "test", Role.ADMIN, "", "");
        
            await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
            await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
        
            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL+"/sessions")
                .send({ username: "testAdmin", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];
        
            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .get(baseURL + "/users/testError")
                .set("Cookie", sessionID);
        
            // Verifica della risposta
            expect(response.status).toBe(404);
            
        }, 10000)

    });

    describe("Delete User", () => {
        test("Deletes a specific user,  ADMIN delete CUSTOMER", async () => {
            await cleanup();
            const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
            const user3 = new User("testAdmin", "test", "test", Role.ADMIN, "", "");
        
            await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
            await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
        
            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL + "/sessions")
                .send({ username: "testAdmin", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];
        
            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .delete(baseURL + "/users/test" )
                .set("Cookie", sessionID);
        
            // Verifica della risposta
            expect(response.status).toBe(200);
            
        }, 10000);

        
        test("Deletes a specific user, ADMIN delete ANOTHER ADMIN ", async () => {
            await cleanup();
            const user3 = new User("testAdmin", "test", "test", Role.ADMIN, "", "");
            const user4 = new User("testAdmin1", "test", "test", Role.ADMIN, "", "");

            await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
            await userDAO.createUser(user4.username, user4.name, user4.surname, "test", user4.role);

            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL + "/sessions")
                .send({ username: "testAdmin", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];

            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .delete(baseURL+ "/users/testAdmin1")
                .set("Cookie", sessionID);

            // Verifica della risposta
            expect(response.status).toBe(401);
            
        }, 10000);
    });

    describe("DeleteAll User", () => {
        test("Delete all users", async () => {
            await cleanup();
            const user1 = new User("test", "test", "test", Role.CUSTOMER, "", "");
            const user3 = new User("testAdmin", "test", "test", Role.ADMIN, "", "");
            await userDAO.createUser(user3.username, user3.name, user3.surname, "test", user3.role);
            await userDAO.createUser(user1.username, user1.name, user1.surname, "test", user1.role);
        
        
            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL + "/sessions")
                .send({ username: "testAdmin", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];
        
            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .delete(baseURL+ "/users")
                .set("Cookie", sessionID);
        
            // Verifica della risposta
            expect(response.status).toBe(200);
            
        }, 10000);
    });

    describe("Update UserInfo", () => {

        test("Update user info - USER UPDATE HIS INFO", async () => {
            await cleanup();
            const updatedUser = new User("userTest", "UpdatedName", "UpdatedSurname", Role.MANAGER,"", "");
        
            await userDAO.createUser(updatedUser.username, updatedUser.name, updatedUser.surname, "test", updatedUser.role);
        
            // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL+ "/sessions")
                .send({ username: "userTest", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];
        
            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .patch(baseURL +"/users/userTest")
                .send({
                    updatedUser,
                    name: 'UpdatedName2',
                    surname: 'UpdatedSurname2',
                    address: 'UpdatedAddress',
                    birthdate: '1990-01-01',
                    username: 'userTest'
                })
                .set("Cookie", sessionID);
        
            console.log(response.body);

            const transformedUsers = {
                ...response.body,
                address: response.body.address == null ? "" : response.body.address,
                birthdate: response.body.birthdate == null ? "" : response.body.birthdate
            };
            console.log(transformedUsers)
            // Verifica della risposta
            expect(response.status).toBe(200);
            //risolvi qui
            
            expect(transformedUsers).toEqual({
                username: updatedUser.username,
                name: 'UpdatedName2',
                surname: 'UpdatedSurname2',
                role: updatedUser.role,
                address:  'UpdatedAddress',
                birthdate: '1990-01-01'
            });
            

            await cleanup();
        
        }, 10000);

        test("Update user info - ERROR 401", async () => {
            await cleanup();
            const updatedUser = new User("userTest", "UpdatedName", "UpdatedSurname", Role.MANAGER, "UpdatedAddress", "1990-01-01");
            const user = new User("userTest2", "UpdatedName", "UpdatedSurname", Role.CUSTOMER, "UpdatedAddress", "1990-01-01");
        
            await userDAO.createUser(updatedUser.username, updatedUser.name, updatedUser.surname, "test", updatedUser.role);
            await userDAO.createUser(user.username, user.name, user.surname, "test", user.role);
        // Creazione di una sessione admin per autenticare la richiesta
            const adminSession = await request(app)
                .post(baseURL + "/sessions")
                .send({ username: "userTest2", password: "test" });
            const sessionID = adminSession.headers['set-cookie'];
        
            // Effettuare la richiesta per ottenere l'utente
            const response = await request(app)
                .patch( baseURL +"/users/userTest")
                .send({
                    user,
                    name: 'UpdatedName',
                    surname: 'UpdatedSurname',
                    address: 'UpdatedAddress',
                    birthdate: '1990-01-01',
                    username: 'userTest',
                })
                .set("Cookie", sessionID);
        
            const transformedUsers = {
                ...response.body,
                address: response.body.address === null ? "" : response.body.address,
                birthdate: response.body.birthdate === null ? "" : response.body.birthdate
            };
        
            // Verifica della risposta
            expect(response.status).toBe(401);
            await cleanup();
            
        }, 10000)

        
    });
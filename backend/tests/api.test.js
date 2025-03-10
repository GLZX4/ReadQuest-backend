const request = require("supertest");
const server = require("../server"); // Import server instance
const { pool, closeDB } = require("../middleware/dbConfig");

afterAll(async () => {
    await closeDB(); 
    server.close();  
});

// Testing JWT Authentication
describe("API Route Tests", () => {
    test("GET /api/student/completed-rounds should return 400 if no userID is provided", async () => {
        const response = await request(server).get("/api/student/completed-rounds");
        console.log("Debug Response:", response.status, response.body);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Token is missing");
    });

    test("GET /api/student/get-streak should return 400 if studentId is missing", async () => {
        const response = await request(server).get("/api/student/get-streak");
        console.log("Debug Response:", response.status, response.body);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Token is missing");
    });
});

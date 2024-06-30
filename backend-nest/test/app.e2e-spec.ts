import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { WELCOME_MESSAGE } from "../src/app.service";

const testCases = [
    {
        url: "/metro?station=Anděl",
        platforms: ["U1040Z101P", "U1040Z102P"],
    },
    {
        url: "/metro?station=andel",
        platforms: ["U1040Z101P", "U1040Z102P"],
    },
    {
        url: "/metro?station=Dejvická",
        platforms: ["U321Z101P", "U321Z102P"],
    },
    {
        url: "/metro?station=DEJVICKA",
        platforms: ["U321Z101P", "U321Z102P"],
    },
    {
        url: "/metro?station=Anděl&station=Dejvická",
        platforms: ["U1040Z101P", "U1040Z102P", "U321Z101P", "U321Z102P"],
    },
    {
        url: "/metro?station=[Anděl,Dejvická]",
        platforms: ["U1040Z101P", "U1040Z102P", "U321Z101P", "U321Z102P"],
    },
    {
        url: '/metro?station=["Anděl","Dejvická"]',
        platforms: ["U1040Z101P", "U1040Z102P", "U321Z101P", "U321Z102P"],
    },
];

describe("AppController (e2e)", () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("/ (GET)", () => {
        return request(app.getHttpServer())
            .get("/")
            .expect(200)
            .expect(WELCOME_MESSAGE);
    });

    for (const testCase of testCases) {
        const encodedURL = encodeURI(testCase.url);

        it(`${testCase.url} (GET)`, async () => {
            await wait(1_000); // avoid rate limiting

            return request(app.getHttpServer())
                .get(encodedURL)
                .expect(200)
                .expect("Content-Type", /json/)
                .expect((res) => {
                    expect(res.body).toBeInstanceOf(Array);

                    res.body.forEach((dep) =>
                        testDepartureItem(dep, testCase.platforms),
                    );
                });
        });

        const groupByPlatformURL = `${encodedURL}&groupBy=platform`;
        it(`${testCase.url}&groupBy=platform (GET)`, async () => {
            await wait(1_000); // avoid rate limiting

            return request(app.getHttpServer())
                .get(groupByPlatformURL)
                .expect(200)
                .expect("Content-Type", /json/)
                .expect((res) => {
                    expect(res.body).toBeInstanceOf(Object);
                    testCase.platforms.forEach((platform) => {
                        expect(Object.keys(res.body)).toContain(platform);
                        res.body[platform].forEach((dep) =>
                            testDepartureItem(dep, [platform]),
                        );
                    });
                });
        });

        const groupByDirectionURL = `${encodedURL}&groupBy=heading`;
        it(`${testCase.url}&groupBy=heading (GET)`, async () => {
            await wait(1_000); // avoid rate limiting

            return request(app.getHttpServer())
                .get(groupByDirectionURL)
                .expect(200)
                .expect("Content-Type", /json/)
                .expect((res) => {
                    expect(res.body).toBeInstanceOf(Object);

                    Object.values(res.body)
                        .flat()
                        .forEach((dep) => {
                            testDepartureItem(dep, testCase.platforms);
                        });
                });
        });
    }
});

const testDepartureItem = (departure, platforms: string[]) => {
    expect(departure).toBeInstanceOf(Object);
    expect(departure).toHaveProperty("delay");
    expect(departure).toHaveProperty("departure");
    expect(Date.parse(departure.departure)).not.toBeNaN();
    expect(departure).toHaveProperty("heading");
    expect(departure).toHaveProperty("line");
    expect(departure.line).toMatch(/^(A|B|C)$/);
    expect(departure).toHaveProperty("platform");
    expect(platforms).toContain(departure.platform);
};

const wait = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

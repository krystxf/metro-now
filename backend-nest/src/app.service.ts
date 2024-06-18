import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
    getHello(): string {
        return `
            <h1>
                Hello, fellow developer👋
            </h1>
            <p>
                Thank you for checking out my project.
                You can find the API documentation <a href="https://metro-now.vercel.app/docs/rest-api">here</a>.
            </p>
        `;
    }
}

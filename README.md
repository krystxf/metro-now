# METRO NOW

![Apple watch screenshots](https://github.com/krystxf/metro-now/assets/48121710/3ce8f583-c260-4588-b63d-63ecadd22333)

# Setup

this project uses [turbo repo](https://turbo.build/repo/docs)

```bash
pnpm install -r # install dependencies recursively
brew install xcbeautify swiftformat

# turbo options
turbo run format

turbo run docs:start

turbo run backend:v1:start
turbo run backend:v1:build:docker

turbo run backend:v2:start

turbo run app:build
turbo run app:test
```

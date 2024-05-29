# METRO NOW

![Apple watch screenshots](https://github.com/krystxf/metro-now/assets/48121710/3ce8f583-c260-4588-b63d-63ecadd22333)

# Setup

this project uses [turbo repo](https://turbo.build/repo/docs)

```bash
pnpm install -r # install dependencies recursively
brew install xcbeautify swiftformat # install swift dependencies

# turbo options
turbo run format

turbo run docs:start backend:v1:start backend:v2:start
# runs on ports 3000, 3001, 3002 respectively

# open app directory in xcode for better experience
```

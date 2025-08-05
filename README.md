## Description

This template allows you to create webservices using Node js. The service is scaffolded with Nest JS framework. The detailed docs can be found by going to their official website as given below. This template has taken care of the following:

- Logging [Using winston logger]
- Configuration management [We have created a dedicated config module to manage configuration across the services]
- Database: Their is a setup for connecting to mysql database. The same cn be extended to connect to postgres or any other database.

This repo has been setup using Nest JS. The official documentation for the framework is available here:
[Nest Docs](https://docs.nestjs.com/)

## Basic Setup

To get the code setup on the system go to the below url and clone the repository

```
https://github.com/Admin-Akasa/nexus
```

### Command to clone the repository

```
git clone <clone url>
```

### Start the server

To start the server run the below command:

```
npm run start
```

### Run the tests

To run the tests, run the below command

```
npm run test
```

### Server platform

Nest provides both Express and fastify out of the box. We have integrated Fastify as an underlying platform. Nest guarantees a 50% better performance than Express. You can read more about here:
[Fastify performance](https://docs.nestjs.com/techniques/performance)

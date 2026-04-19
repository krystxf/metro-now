import gql from "graphql-tag";

export const SEARCH_STOPS = gql`
    query SearchStops($query: String!) {
        searchStops(query: $query, limit: 20) {
            id
            feed
            name
            avgLatitude
            avgLongitude
            platforms {
                id
                routes {
                    name
                    color
                    vehicleType
                }
            }
        }
    }
`;

export const ALL_STOPS = gql`
    query AllStops {
        stops(limit: 500) {
            id
            feed
            name
            avgLatitude
            avgLongitude
            platforms {
                id
                routes {
                    name
                    color
                    vehicleType
                }
            }
        }
    }
`;

export const CLOSEST_STOPS = gql`
    query ClosestStops($latitude: Float!, $longitude: Float!, $limit: Int) {
        closestStops(latitude: $latitude, longitude: $longitude, limit: $limit) {
            distance
            stop {
                id
                feed
                name
                avgLatitude
                avgLongitude
                platforms {
                    id
                    routes {
                        name
                        color
                        vehicleType
                    }
                }
            }
        }
    }
`;

export const GET_STOP = gql`
    query GetStop($id: ID!) {
        stop(id: $id) {
            id
            feed
            name
            avgLatitude
            avgLongitude
        }
    }
`;

export const GET_DEPARTURES = gql`
    query GetDepartures($stopIds: [ID!]) {
        departures(stopIds: $stopIds, limit: 30, minutesAfter: 120) {
            id
            headsign
            delay
            isRealtime
            platformCode
            departureTime {
                predicted
                scheduled
            }
            route {
                id
                feed
                name
                color
                vehicleType
            }
        }
    }
`;

export const GET_ROUTE = gql`
    query GetRoute($id: ID!, $feed: Feed) {
        route(id: $id, feed: $feed) {
            id
            feed
            name
            color
            vehicleType
            directions {
                id
                platforms {
                    id
                    name
                    stop {
                        id
                        name
                    }
                }
            }
        }
    }
`;

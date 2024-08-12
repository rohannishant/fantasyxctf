import postgres from "postgres";

const sql = postgres("postgres://rohan:password@localhost:5432/fantasyxctf");

export default sql; 
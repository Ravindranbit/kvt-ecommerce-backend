const bcrypt = require("bcrypt");

const testPassword = "Admin@123";
const storedHash = "$2b$10$GZew92gx5YIHifj6cQlQIePGTd1zczN9CHYVj.S5SSMMrPPaBZ4qW";

async function testPasswordMatch() {
  try {
    console.log("Testing password: ", testPassword);
    console.log("Stored hash: ", storedHash);
    
    const isValid = await bcrypt.compare(testPassword, storedHash);
    console.log("Password match:", isValid);
  } catch (error) {
    console.error("Error:", error);
  }
}

testPasswordMatch();

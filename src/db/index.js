import mongoose from 'mongoose'
import {DB_NAME} from "../constants.js"


const connectDB= async ()=>{

    try {
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        console.log(`\n MongoBD connectecd !! DB Host ${connectionInstance.connection.host} :: PORT :${connectionInstance.connection.port} :: name : ${connectionInstance.connection.name}`)
        console.log(`Ready state: ${connectionInstance.connection.readyState}`);

        
    } catch (error) {
        console.log("Mongo DB connection FAILED :: ",error.message);
        
        process.exit(1)
        
    }
    
    
}



export default connectDB




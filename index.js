import express from 'express'
import { Schema, mongoose } from 'mongoose'
import bcrypt from "bcrypt"


// const URI = 'mongodb+srv://sarvesh:sarvesh@cluster0.ssprl0p.mongodb.net/TodoList'
const app = express()
app.use(express.json())

const URI = "mongodb+srv://sarvesh:sarvesh@cluster0.ssprl0p.mongodb.net/TodoList"

mongoose.connect(URI
).then(() => {
    app.listen(3000, () => {
        console.log(`Mongo db connected using string ${URI}`);

    })
})
    .catch((err) => console.log('Error connecting the db', err))



app.get('/', (req, res) => {
    res.send('MongoDB Atlas Connection Successful');
});

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
},
    { timestamps: true }
)
export const User = mongoose.model('User', UserSchema)



app.get("/all", (req, res) => {
    res.status(200).json({
        message: "you are in home page",
        id: 122
    })
})

app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        let user = await User.findOne({ email });
        // console.log('user', user)
        if (user) {
            return res.status(400).json({
                message: "User already exists"
            })
        }
        user = await User.create({
            name, email, password: hashedPassword
        })
        console.log('body', req.body)
        res.json({
            success: true,
            message: "user successfully registered",
            user
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error registering user",
            error: error.message
        });
    }
})

app.get("/login", async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                message: "Invalid username or password"
            })
        }
        const isPasswordmatch = await bcrypt.compare(password, user.password)
        if (!isPasswordmatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }
        res.status(200).json({
            success: true,
            message: "Logged in successfully"
        })
    } catch (error) {
        res.status(200).json({
            success: true,
            message: error
        })
    }
})

app.put("/update/:id", async (req, res) => {
    try {
        const { name, email, password } = req.body
        const { id } = req.params
        let user = await User.findById(id)
        if (!user) {
            return res.send(" user not found")
        }
        if (name) user.name = name
        if (email) user.email = email

        if (password) {
            const salt = await bcrypt.genSalt(10)
            user.password = await bcrypt.hash(password, salt)
        }
        console.log('user', user)
        await user.save()
        res.json({
            message: "User updated successfully",
            user
        })
    } catch (error) {
        res.json({ message: `error while updating:${error}` })
    }

})

app.delete("/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id)
        if (!user) {
            return res.status(401).json({
                message: "user not found"
            })
        }
        res.status(200).json({
            message: "User deleted successfully",
            user
        });
    } catch (error) {
        res.json({
            message: error
        })
    }
})

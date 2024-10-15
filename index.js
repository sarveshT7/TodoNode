import express from 'express'
import { Schema, mongoose } from 'mongoose'
import bcrypt from "bcrypt"
import fastcsv from "fast-csv"
import fs from "fs"

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
        required: true,
        minLength: 4
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    age: {
        type: Number
    },
    status: {
        type: Boolean,
        default: true
    },
    password: {
        type: String,
        required: true
    }
},
    { timestamps: true }
)
export const User = mongoose.model('User', UserSchema)



app.get("/all", async (req, res) => {
    const user = await User.find()
    res.status(200).json({
        message: "you are in home page",
        user
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
        const { name, email, status, password, age } = req.body
        const { id } = req.params
        // let user = await User.findById(id)
        // if (!user) {
        //     return res.send(" user not found")
        // }
        // if (name) user.name = name
        // if (email) user.email = email
        // if (age) user.age = age

        // if (password) {
        //     const salt = await bcrypt.genSalt(10)
        //     user.password = await bcrypt.hash(password, salt)
        // }
        // console.log('user', user)

        // const user = await User.updateOne({ _id: id },
        //     {
        //         $set: { name, email, status }
        //     }
        // )

        const user = await User.findByIdAndUpdate(id,
            { $set: { name, email, status } },
            { new: true, runValidators: true }
        )
        if (!user) {
            return res.send(" user not found")
        }
        // await user.save()
        res.json({
            message: "User updated successfully",
            user
        })
    } catch (error) {
        res.json({ message: `error while updating:${error}` })
    }

})

app.put("/update-many", async (req, res) => {
    try {
        const updatedUsers = await User.updateMany(
            {}, //e,pty filter for selecting all the users
            // { $set: { age: 26 } },
            {
                $inc: { age: 1 },
                $set: { isActive: true }
            },
            { $upsert: false }
        )
        res.json({
            message: `${updatedUsers.modifiedCount} users updated with new field called age`,
            success: true
        })
    } catch (error) {
        res.status(500).json({ message: error })
    }
})


app.get("/report", async (req, res) => {
    const { fromDate, toDate } = req.query
    if (!fromDate || !toDate) {
        res.status(400).json({
            message: "Please provide from date and to date",
            success: false
        })
    }
    try {
        const from = new Date(fromDate)
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        const user = await User.find({
            createdAt: {
                $gte: from,
                $lte: to
            }
        })
        console.log('user', user)
        res.status(200).json({
            message: 'succesfully fetched',
            user
        })
    } catch (error) {
        res.status(400).json({
            message: error,
            success: false
        })
    }
})
app.get("/users", async (req, res) => {
    const { fromDate } = req.query
    if (!fromDate) {
        res.status(400).json({
            message: "enter the from date",
            success: false
        })
    }
    try {
        const users = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(fromDate) },
                    email: { $regex: /gmail\.com$/, $options: 'i' }
                }
            },
            // selects the fields which are necessary to be sent in response
            {
                $project: {
                    name: 1,
                    email: 1,
                    // createdAt: 1
                }
            },
            // sorts date in descending order
            {
                $sort: {
                    createdAt: -1
                }
            }

        ])
        if (!users) {
            res.status(400).json({ message: "user not found", success: false })
        }
        res.status(200).json({
            message: "users found successfully",
            users
        })
    } catch (error) {
        res.status(400).json({ message: error, success: false })
    }

})



// Route to generate and download the CSV report
app.get('/generate-csv', async (req, res) => {
    try {
        const filePath = './users_report.csv';
        const writeStream = fs.createWriteStream(filePath);

        // Create a cursor to stream the data
        const cursor = User.find().cursor();

        // Create a write stream for the CSV file with headers
        const csvStream = fastcsv.format({ headers: ['Name', 'Email', 'Age', 'Status'] });

        // Pipe CSV stream to the file write stream
        csvStream.pipe(writeStream);

        // Stream each user document to CSV
        cursor.on('data', (user) => {
            csvStream.write([user.name, user.email, user.age, user.status]);
        });

        cursor.on('end', () => {
            // Close CSV and write streams once all data is processed
            csvStream.end();
        });

        // Once the CSV is fully written, send the file for download
        writeStream.on('finish', () => {
            res.download(filePath, 'users_report.csv', (err) => {
                if (err) {
                    console.error('Error while sending the file:', err);
                    res.status(500).json({ message: 'Error generating report' });
                }
            });
        });

    } catch (error) {
        res.status(500).json({ message: `Error generating report: ${error.message}` });
    }
});

app.get("/search", async (req, res) => {
    const { name, email, status ,sort} = req.query
    let query = {}
    if (name) {
        query.name = { $regex: name, $options: 'i' }
    }
    if (email) {
        query.email = { $regex: email, $options: 'i' }
    }
    if (status) {
        query.status = status
    }
    const searchedres = await User.find(query, { password: 0 }).sort({ [sort]: -1 }).lean()
    const noofUsers = await User.countDocuments(query)

    res.json({
        message: `total no of users ${noofUsers}`,
        users: searchedres
    })
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

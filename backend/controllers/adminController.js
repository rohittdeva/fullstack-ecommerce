const { pool } = require("../config/database")
const catchAsyncErrors = require("../middleware/catchAsynErrors")
const errorHandler = require("../utils/errorHandler")
const { v4: uuidv4 } = require("uuid");
const { sendAdminToken } = require("../utils/jwtToken")
const sendEmail = require("../utils/sendMail")
const crypto = require("crypto")


//generate random uuid

const generate_uuid = () => {
    return uuidv4();
  };

//generate random password of 10 length

const generateRandomPassword = (length) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(charset.length);
        password += charset[randomIndex];
    }
    return password;
};

//admin operations on users

//admin login

exports.adminLogin = catchAsyncErrors(async(req, res, next) => {
    const { email, password } = req.body

    if(!email || !password){
        return next(new errorHandler("Enter all the required fields.", 400))
    }

    const [admin] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email])
    const [pass] = await pool.execute('SELECT password FROM admins WHERE email = ?', [email])

    if(admin.length > 0 && pass[0].password === password){
        sendAdminToken(admin, 201, res)        
    }else{
        res.status(400).json({
            success: false,
            message: "Invalid email or password."
        })
    }
})

//logout

exports.logout = catchAsyncErrors(async(req, res, next) => {
    res.cookie("ADMINAUTHCOOKIE", null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: "Admin Logged Out."
    })
})


//get all users

exports.getallusers = catchAsyncErrors(async(req, res, next) => {
    try{
        const [users] = await pool.execute('SELECT * FROM users')

        if(users.length > 0){
            res.status(200).json({
                success: true,
                users
            })
        }else{
            res.status(404).json({
                success: false,
                message: "No users"
            })
        }
    }catch(err){
        return next(new errorHandler(`Something went wrong\n${err}`, 500))
    }
})

//get all admins

exports.getalladmins = catchAsyncErrors(async(req, res, next) => {
    try{
        const [admins] = await pool.execute('SELECT * FROM admins')

        if(admins.length > 0){
            res.status(200).json({
                success: true,
                admins
            })
        }else{
            res.status(404).json({
                success: false,
                message: "No users"
            })
        }
    }catch(err){
        return next(new errorHandler(`Something went wrong\n${err}`, 500))
    }
})

//change admin role

exports.changeAdminRole = catchAsyncErrors(async(req, res, next) => {
    const { email, role } = req.body

    if(!email){
        return next(new errorHandler("Enter the Email", 400))
    }

    const [previousRole] = await pool.execute('SELECT role from admins WHERE email = ?', [email])

    try{
        if(previousRole[0].role === role){
            res.status(200).json({
                success: false,
                message : `already in ${role} role`
            })
        }else{
            await pool.execute('UPDATE admins SET role = ? WHERE email = ?', [role, email])
            res.status(200).json({
                success: true,
                message: `Role updated to ${role}`
            })
        }
    }catch(err){
        return next(new errorHandler("No admin found.", 404))
    }
})


//add new admin

exports.addNewAdmin = catchAsyncErrors(async(req, res, next) => {
    const { fullname, email, role } = req.body

    if(!email || !fullname || !role){
        return next(new errorHandler("Enter all the required inputs.", 400))
    }

    const [existingAdmin] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email])

    if(existingAdmin.length > 0){
        res.status(200).json({
            success: false,
            message : "Admin already exists."
        })
    }else{
        const uuid = generate_uuid()
        const password = generateRandomPassword(20)
        const message = ```You have been added as ${role}
                           path: /admin/login
                           password: ${password}
                        ```
        await pool.execute('INSERT INTO admins (id, fullname, role, email, password) VALUES(?, ?, ?, ?, ?)', [uuid, fullname, role, email, password])
        try{
            await sendEmail({
                email,
                subject: "Admin password",
                message
            })
            res.status(200).json({
                success: true,
                message: `New ${role} added and email sent successfully`
            })
        }catch(err){
            return next(new errorHandler(err.message, 500))
        }
    }
})

//delete admin

exports.deleteAdmin = catchAsyncErrors(async(req, res, next) => {
    const { email } = req.body

    if(!email){
        return next(new errorHandler("Enter the email.", 400))
    }

    const [admin] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email])

    if(admin.length > 0){
        await pool.execute('DELETE FROM admins WHERE email = ?', [email])

        res.status(200).json({
            success: true,
            message: "Admin successfully deleted"
        })
    }else{
        res.status(404).json({
            success: false,
            message: "Admin doesn't exist."
        })
    }
})

//delete user

exports.deleteUser = catchAsyncErrors(async(req, res, next) => {
    const { email } = req.body

    if(!email){
        return next(new errorHandler("Enter the email.", 400))
    }

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ?', [email])

    if(user.length > 0){
        await pool.execute('DELETE FROM users WHERE email = ?', [email])

        res.status(200).json({
            success: true,
            message: "User successfully deleted"
        })
    }else{
        res.status(404).json({
            success: false,
            message: "User doesn't exist."
        })
    }
})
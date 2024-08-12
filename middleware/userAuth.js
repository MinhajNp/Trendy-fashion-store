
const UserModel = require("../model/userSchema");

const isLogin=async(req,res,next)=>{

    try {

         if(req.session.user_id){
            const userId = req.session.user_id;
            const user = await UserModel.findOne({ _id:userId });
            if(user.isBlock){
                console.log("admin bloked user")
                res.render("user/userLogin",{message: "Admin Blocked You,Please contact us for more information!"})
            }
            else{
               next() 
            }
            
         }
         else{
          
             console.log("login")
            res.redirect('/login') 
         }
            
    } catch (error) {
        console.log(error.message,+"error in isLogin")  
    }
 } 


 const isLogout=async(req,res,next)=>{

    try { 
 
        if(req.session.user_id){
            res.redirect("/")
        }
        else{
            next();
        }
        
        
    } catch (error) {
        console.log(error.message) 
    }
 }

 module.exports = {
    
    isLogout,
    isLogin
   
 }
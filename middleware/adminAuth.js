

const isLogout = async (req, res, next) => {
    try {
        if (req.session.admin_id) {
            // res.redirect("admin/home")
            res.render("admin/adminDashboard")
        }
        else {
            next();
        }
    } catch (error) {
        console.log(error.message)
    }
}

const isLogin = async (req, res, next) => {
    try {
        if (req.session.admin_id) {
            next()
        }
        else {
            res.redirect("/adminLogin");
        }
    } catch (error) {
        console.log(error.message)
    }

}

module.exports = {

    isLogout,
    isLogin

}
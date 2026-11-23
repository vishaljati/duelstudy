import { Router } from "express";
import { registerUser ,
         loginUser ,
         logOutUser,
         refreshAccessToken, 
         changeCurrentPassword,
         getCurrentUser,
         updateAccountDetails } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router= Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken)

//secured routes
router.route("/logout").post(verifyJWT, logOutUser)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/me").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)


export default router;
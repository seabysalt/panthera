const express = require("express")
const router = express.Router()
const ensureLogin = require("connect-ensure-login");
const User = require("../models/User");
const Content = require("../models/Content");
const getArticlesForInterest = require("../public/javascripts/newApi");
const axios = require("axios")
const hbs = require("hbs")


//##############################################
const meetup = require('meetup-api')({
    key: process.env.MEETUP_API
});
const getMeetupEvent = tag => {
    return `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&topic_category=${tag}&page=20&radius=smart`
}
//##############################################

hbs.registerHelper("stringify", (data) => JSON.stringify(data))

router.get("/profile", ensureLogin.ensureLoggedIn(), (req, res) => {
    res.render("session/profile", { User, user: req.user });
});

router.get("/content/like", (req, res) => {
    console.log(req.body);
});

router.post("/profile", (req, res) => {
    const interest = req.body.interest;
    if (interest.length) {
        User.findByIdAndUpdate(req.user.id, {
            interests: req.user.interests.concat(interest)
        }, { new: true }).then(() => {
            res.redirect("/session/profile");
        }).catch(err => {
            console.log(err)
        })
    }
})
router.get('/profile/deleteInterest/:interestId', (req, res) => {
    console.log(req.params)
    User.findByIdAndUpdate(req.user.id, {
        interests: req.user.interests.filter(x => x !== req.params.interestId)
    }, { new: true }).then(() => {
        res.redirect("/session/profile");
    }).catch(err => {
        console.log(err)
    })
    res.redirect("/session/profile");
})


router.get("/home", ensureLogin.ensureLoggedIn(), (req, res) => {
    res.send(getMeetupEvent('art'))
    let interestsFeed = [...req.user.interests].map(el => getArticlesForInterest(el, 'en'))

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    Promise.all(interestsFeed).then(feed => {
        const feedArticles = (feed.reduce((acc, val) => {
            return acc.concat(val.articles)
        }, []))
        res.render("session/home", { user: req.user, feedArticles: shuffle(feedArticles).splice(0, 10) });
    }).catch(err => {
        console.log(err)
    })
});

//######### LIKE BUTTON, | CREATE POST IN DB or IF ALREADY IN DB PUSH USER ID IN 'likedBy' #########
router.post("/content/like", (req, res) => {
    const content = req.body.article;
    const userId = req.user.id;

    Content.findOne({ article: content }).then(match => {
        if (match) {
            const updatedLikedBy = match.likedBy.concat(userId);
            match.update({ likedBy: updatedLikedBy }).then(() => { console.log("Updated") }).catch(err => { console.log(err) })
        }
        else {
            Content.create({ article: content, likedBy: [userId] }).then(newArticle => {
                console.log(newArticle)
            }).catch(err => { console.log(err) })
        }
    }).catch(err => { console.log(err) })
})

//########### PEERS
router.get("/peers", (req, res) => {
    const myInterests = req.user.interests;
    User.find({ 'interests': { $in: myInterests } }).then(users => {
        const sameInterestUsers = users.filter(obj => obj.id !== req.user.id)
        const sameInterestUsersId = sameInterestUsers.map(x => x.id)
        //---

        Content.find({ 'likedBy': { '$in': sameInterestUsersId } }).then(articlesLikedByUsers => {
            //res.send(articlesLikedByUsers[0].article)
            res.render("session/peers", { user: req.user, sameInterestUsers, articlesLikedByUsers: articlesLikedByUsers });
        }).catch(err => console.log(err))
        //---
        // res.render("session/peers", { user: req.user, sameInterestUsers });
    }).catch(err => {
        console.log(err)
    })
})

router.get("/featured", (req, res) => {
    res.render("session/featured", { user: req.user });
})

router.get("/blog", (req, res) => {
    res.render("session/blog", { user: req.user });
})

router.get("/search", (req, res) => {
    res.render("session/search", { user: req.user });
})

module.exports = router;
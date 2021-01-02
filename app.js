const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));

mongoose.connect("mongodb+srv://admin_rahul:admin@123$@cluster0.zujx9.mongodb.net/todoDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  //console.log("connection successfull!");
});

const todoSchema = new mongoose.Schema({
    item: {
        type: String,
        required: true
    }
});

const Todo = mongoose.model("Todo", todoSchema);

const listSchema = new mongoose.Schema({
    title: String,
    items: [todoSchema]
});

const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
    Todo.find({}, (err, items) => {
        if(err)
            res.redirect("/");
        else
            res.render("home", {title: 'Today', items: items});
    });
});

app.get("/edit/:id/:title", (req, res) => {
    const {id, title} = req.params;

    if(title === 'Today'){
        Todo.findById(
            {_id: id}, 
            (err, todayItem) => {
            if(err)
                console.log(err);
            else {
                res.render("home", {title: "Today", item: todayItem.item, id: id});
            }
        });
    } else {
        List.findOne(
            {title: _.lowerCase(title)},
            (err, listItem) => {
            if(err)
                console.log(err);
            else {
                const item = listItem.items.filter(item => item._id == id);
                res.render("home", {title: _.capitalize(listItem.title), item: item[0].item, id: item[0]._id});
            }
        });
    }


});

app.get("/delete/:id/:deleteTitle", (req, res) => {
    const {id, deleteTitle} = req.params;

    if(deleteTitle === 'Today') {
        Todo.findByIdAndRemove(
            {_id: id}, 
            (err) =>{
            if(!err)
                res.redirect("/");
        });
    } else {
        List.findOneAndUpdate(
            { title: _.lowerCase(deleteTitle) },
            { $pull: { items: { _id: id} } },
            { new: true },
            (err) => {
                if (err) { console.log(err) }
            }
        )
        res.redirect("/" + _.lowerCase(deleteTitle));
    }
    
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get("/:newList", (req, res) => {
    const {newList} = req.params; 

    List.findOne({title: _.lowerCase(newList)}, 
    (err, lists) => {
        if(err)
            console.log(err);
            else {
            if(!lists) 
                res.render("home", {title: _.capitalize(newList), items: []});
            else
                res.render("home", {title: _.capitalize(lists.title), items: lists.items});
        }
    });
});

app.get("*", (req, res) => {
    res.render("pageNotFound");
});

app.post("/", (req, res) => {
    const {todoItem, hidden} = req.body;
    const itemTitle = req.body.todoBtn;

    const todo = new Todo({
        item: todoItem
    });

    if(itemTitle === 'Today') {
        if(hidden != ""){
            Todo.findByIdAndUpdate(
                {_id: hidden}, 
                {item: todoItem}, 
                (err) => {
                if(err){
                    console.log(err);
                } else {
                    res.redirect("/");
                }
            })
        } else {
            todo.save().then(() => res.redirect("/"));
        }
    }
    else{
        List.findOne({title: _.lowerCase(itemTitle)}, (err, itemFound) => {
            if(err)
                console.log(err);
            else {
                if(itemFound) {
                    if(hidden != ""){
                        const [item] = itemFound.items.filter(item => item._id == hidden);
                        item.item = todoItem;
                        itemFound.save().then(() => res.redirect("/" + itemTitle));
                    } else {
                        itemFound.items.push(todo);
                        itemFound.save().then(() => res.redirect("/" + itemTitle));
                    }
                } else { 
                    const list = new List({
                        title: _.lowerCase(itemTitle),
                        items: todo
                    });
                    list.save().then(() => res.redirect("/" + itemTitle));
                }
            }
        })
    }
    
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
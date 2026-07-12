global.users;
global.user_id = 1;

function register(req, res) {
  const { name, email, password } = req.body;

  const user = {
    id: global.user_id,
    email,
    name,
    password,
  };
  global.user_id = user.id;

  global.users.push(user);
  global.user_id += 1;

  res.status(201).json({
    name,
    email,
  });
}

function logon(req, res) {
  const { email, password } = req.body;

  const currentUser = global.users.find((user) => user.email === email);

  if (currentUser) {
    const name = currentUser.name;
    if (currentUser.password === password) {
      global.user_id = currentUser.id;
      res.status(200).json({
        name,
        email,
      });
    } else {
      res.status(401).json();
    }
  } else {
    res.status(401).json();
  }
}

function logoff(req, res) {
  global.user_id = null;
  res.status(200).json();
}

module.exports = {
  register,
  logon,
  logoff,
};

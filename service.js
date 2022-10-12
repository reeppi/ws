const users = {};
const games = {};

exports.users = users;
exports.games = games;


exports.getUsername = function getUsername(ws)
{
  var username="";
  Object.keys(users).forEach(e => {
    if ( ws ===  users[e].ws )
      username = e;
  });
  return username;
}

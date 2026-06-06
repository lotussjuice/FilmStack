const PocketBase = require('pocketbase').default || require('pocketbase');

async function run() {
  try {
    const pb = new PocketBase('http://localhost:8090');
    // login as superuser
    await pb.admins.authWithPassword('admin@filmstack.cl', 'test12345678');
    console.log('Logged in as superuser');
    
    // get users collection
    const usersCollection = await pb.collections.getOne('users');
    console.log('Got users collection');
    
    // update rules
    usersCollection.listRule = "@request.auth.id != '' && deleted = false";
    usersCollection.viewRule = "@request.auth.id != '' && deleted = false";
    
    // save
    await pb.collections.update('users', usersCollection);
    console.log('Users collection updated successfully');
  } catch (e) {
    console.error('Error:', e);
  }
}

run();

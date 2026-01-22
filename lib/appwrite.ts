import { Client, Account, Databases, Storage, Avatars, ID, Query } from 'appwrite';

// Appwrite Configuration - same as Master3 app
export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  projectId: "66f2579c002ae28287de",
  databaseId: "66f2586d003223ce58b6",
  storageId: "66f2584b00068c76ed1b",
  userCollectionId: "66f259820009c9236589",
  childCollectionId: "66f3e360003a674e4bde",
  paymentCollectionId: "66f8107a00211893d145",
};

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

// Types
export interface User {
  $id: string;
  accountId: string;
  email: string;
  username: string;
  avatar: string;
  isInitial?: boolean;
}

export interface Child {
  $id: string;
  client_id: string;
  victime_name: string;
  victim_id: string;
  is_Premium: boolean;
}

export interface Payment {
  $id: string;
  client_id: string;
  device_name: string;
  device_id: string;
  date: string;
  amount: number;
  status: boolean;
}

// Auth Functions
export async function createUser(email: string, password: string, username: string): Promise<User> {
  try {
    const newAccount = await account.create(ID.unique(), email, password, username);
    if (!newAccount) throw new Error("Failed to create account");

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email: email,
        username: username,
        avatar: avatarUrl.toString(),
        isInitial: false,
      }
    );

    return newUser as unknown as User;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Registration failed');
  }
}

export async function signIn(email: string, password: string) {
  try {
    // Delete any existing session first
    try {
      await account.deleteSession("current");
    } catch {
      // Ignore error if no session exists
    }

    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Sign in failed');
  }
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch (error) {
    throw new Error("Unable to sign out. Please try again.");
  }
}

export async function getAccount() {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) return null;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser.documents.length) return null;
    return currentUser.documents[0] as unknown as User;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

export async function updateUserPassword(newPassword: string, oldPassword: string) {
  try {
    const updatedAccount = await account.updatePassword(newPassword, oldPassword);
    return updatedAccount;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Password update failed');
  }
}

export async function requestPasswordRecovery(email: string) {
  try {
    const response = await account.createRecovery(email, "");
    return response;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Password recovery failed');
  }
}

export async function updateUserIsInitial(userId: string, isInitial: boolean) {
  try {
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { isInitial }
    );
    return updatedUser;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Update failed');
  }
}

// Child/Device Functions
export async function createChild(form: { client_id: string; victim_name: string; victim_id: string }): Promise<Child> {
  try {
    const newChild = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.childCollectionId,
      ID.unique(),
      {
        client_id: form.client_id,
        victime_name: form.victim_name,
        victim_id: form.victim_id,
        is_Premium: false,
      }
    );
    return newChild as unknown as Child;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to add device');
  }
}

export async function updateChild(id: string): Promise<Child> {
  try {
    const updatedChild = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.childCollectionId,
      id,
      { is_Premium: true }
    );
    return updatedChild as unknown as Child;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update device');
  }
}

export async function getAllChild(accountId: string): Promise<Child[]> {
  try {
    const children = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.childCollectionId,
      [Query.equal("client_id", accountId)]
    );
    return children.documents as unknown as Child[];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get devices');
  }
}

// Payment Functions
export async function createPayment(form: {
  client_id: string;
  device_name: string;
  device_id: string;
  date: string;
  amount: number;
  status: boolean;
}): Promise<boolean> {
  try {
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.paymentCollectionId,
      ID.unique(),
      form
    );
    return true;
  } catch (error) {
    return false;
  }
}

export async function getAllPayments(accountId: string): Promise<Payment[]> {
  try {
    const payments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.paymentCollectionId,
      [Query.equal("client_id", accountId)]
    );
    return payments.documents as unknown as Payment[];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get payments');
  }
}

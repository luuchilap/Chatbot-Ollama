import { useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import UserList from '../components/UserList';

export default function UsersPage() {
  return (
    <>
      <Head>
        <title>User Management</title>
        <meta name="description" content="Manage users in the PostgreSQL database" />
      </Head>

      <div className="container mx-auto py-8">
        <UserList />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  // This is just to ensure the page is server-rendered
  // The actual data fetching happens in the UserList component
  return {
    props: {},
  };
} 
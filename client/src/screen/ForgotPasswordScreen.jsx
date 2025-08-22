import React, { useState } from 'react';
import axios from 'axios';
import Loader from '../components/Loader';
import Error from '../components/Error';
import Success from '../components/Success';

function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/users/forgotpassword', { email });
      setSuccess(response.data.message);
      setEmail(''); // Clear the email field on success
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className='row justify-content-center mt-5'>
      <div className='col-md-5'>
        <div className='bs'>
          <h2>Forgot Password</h2>
          {loading && <Loader />}
          {error && <Error message={error} />}
          {success && <Success message={success} />}

          <form onSubmit={handleSubmit}>
            <input
              type='email'
              className='form-control'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type='submit' className='btn btn-primary mt-3'>
              Send Reset Link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordScreen;

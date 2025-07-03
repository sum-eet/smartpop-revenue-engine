/**
 * Frontend tests for popup creation modal
 * Tests React component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopupCreationModal from '../../src/components/PopupCreationModal';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('PopupCreationModal Component', () => {
  
  beforeEach(() => {
    fetch.mockClear();
  });

  // Test component rendering
  test('RENDER - Should render popup creation form', () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    expect(screen.getByText('Create New Popup')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trigger type/i)).toBeInTheDocument();
  });

  // Test form validation
  test('VALIDATION - Should validate required fields', async () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    const saveButton = screen.getByText('Save Popup');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  // Test form submission
  test('SUBMIT - Should submit form with correct data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        popup: { id: '123', title: 'Test Popup' }
      })
    });

    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Popup' }
    });
    fireEvent.change(screen.getByLabelText(/content/i), {
      target: { value: 'Get 10% off!' }
    });

    // Submit form
    const saveButton = screen.getByText('Save Popup');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('popup-config'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('Test Popup')
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  // Test trigger type selection
  test('TRIGGERS - Should handle trigger type changes', () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    const triggerSelect = screen.getByLabelText(/trigger type/i);
    
    fireEvent.change(triggerSelect, { target: { value: 'scroll_percentage' } });
    expect(screen.getByLabelText(/scroll percentage/i)).toBeInTheDocument();

    fireEvent.change(triggerSelect, { target: { value: 'time_delay' } });
    expect(screen.getByLabelText(/delay \(seconds\)/i)).toBeInTheDocument();

    fireEvent.change(triggerSelect, { target: { value: 'exit_intent' } });
    expect(screen.queryByLabelText(/delay/i)).not.toBeInTheDocument();
  });

  // Test popup position options
  test('POSITION - Should offer position options', () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    const positionSelect = screen.getByLabelText(/position/i);
    expect(positionSelect).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    const positionOptions = options.filter(option => 
      ['center', 'top', 'bottom', 'top-left', 'top-right'].includes(option.value)
    );
    expect(positionOptions.length).toBeGreaterThan(0);
  });

  // Test edit mode
  test('EDIT MODE - Should populate form for editing', () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();
    
    const existingPopup = {
      id: '123',
      title: 'Existing Popup',
      content: 'Existing content',
      trigger_type: 'scroll_percentage',
      trigger_value: '50',
      position: 'center'
    };

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        popup={existingPopup}
      />
    );

    expect(screen.getByDisplayValue('Existing Popup')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('scroll_percentage')).toBeInTheDocument();
    expect(screen.getByText('Update Popup')).toBeInTheDocument();
  });

  // Test error handling
  test('ERROR - Should handle API errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Popup' }
    });
    fireEvent.change(screen.getByLabelText(/content/i), {
      target: { value: 'Test content' }
    });

    const saveButton = screen.getByText('Save Popup');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/error creating popup/i)).toBeInTheDocument();
    });
  });

  // Test modal close
  test('CLOSE - Should call onClose when cancelled', () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  // Test form reset
  test('RESET - Should reset form when closed and reopened', () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();

    const { rerender } = render(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Title' }
    });

    // Close modal
    rerender(
      <PopupCreationModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    // Reopen modal
    rerender(
      <PopupCreationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    // Form should be reset
    expect(screen.getByLabelText(/title/i).value).toBe('');
  });
});
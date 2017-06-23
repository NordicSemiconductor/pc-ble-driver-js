/*
* Not any company's property but Public-Domain
* Do with source-code as you will. No requirement to keep this
* header if need to use it/change it/ or do whatever with it
*
* Note that there is No guarantee that this code will work
* and I take no responsibility for this code and any problems you
* might get if using it.
*
* Code & platform dependent issues with it was originally
* published at http://www.kjellkod.cc/threadsafecircularqueue
* 2012-16-19  @author Kjell Hedstr�m, hedstrom@kjellkod.cc */

// should be mentioned the thinking of what goes where
// it is a "controversy" whether what is tail and what is head
// http://en.wikipedia.org/wiki/FIFO#Head_or_tail_first

/*
    Taken from :https://bitbucket.org/KjellKod/lock-free-wait-free-circularfifo/
    And modified to use simple data types since we do not need atomic operations. (I think)
*/

#ifndef CIRCULARFIFO_SEQUENTIAL_H_
#define CIRCULARFIFO_SEQUENTIAL_H_

#include <atomic>
#include <cstddef>

namespace memory_sequential_unsafe
{
    template<typename Element, size_t Size>
    class CircularFifo
    {
    public:
        enum { Capacity = Size + 1 };

        CircularFifo() : _tail(0), _head(0){}
        virtual ~CircularFifo() {}

        bool push(const Element& item); // pushByMOve?
        bool pop(Element& item);

        bool wasEmpty() const;
        bool wasFull() const;
        bool isLockFree() const;

    private:
        size_t increment(size_t idx) const;

        size_t     _tail;  // tail(input) index
        Element    _array[Capacity];
        size_t     _head; // head(output) index
    };


    // Here with memory_order_seq_cst for every operation. This is overkill but easy to reason about
    //
    // Push on tail. TailHead is only changed by producer and can be safely loaded using memory_order_relexed
    //         head is updated by consumer and must be loaded using at least memory_order_acquire
    template<typename Element, size_t Size>
    bool CircularFifo<Element, Size>::push(const Element& item)
    {
        const auto current_tail = _tail;
        const auto next_tail = increment(current_tail);
        if (next_tail != _head)
        {
            _array[current_tail] = item;
            _tail = next_tail;
            return true;
        }

        return false;  // full queue
    }


    // Pop by Consumer can only update the head
    template<typename Element, size_t Size>
    bool CircularFifo<Element, Size>::pop(Element& item)
    {
        const auto current_head = _head;
        static int counter = 0;
        counter++;
        if (current_head == _tail)
            return false;   // empty queue

        item = _array[current_head];
        _head = increment(current_head);
        return true;
    }

    // snapshot with acceptance of that this comparison function is not atomic
    // (*) Used by clients or test, since pop() avoid double load overhead by not
    // using wasEmpty()
    template<typename Element, size_t Size>
    bool CircularFifo<Element, Size>::wasEmpty() const
    {
        return (_head == _tail);
    }

    // snapshot with acceptance that this comparison is not atomic
    // (*) Used by clients or test, since push() avoid double load overhead by not
    // using wasFull()
    template<typename Element, size_t Size>
    bool CircularFifo<Element, Size>::wasFull() const
    {
        const auto next_tail = increment(_tail);
        return (next_tail == _head);
    }


    template<typename Element, size_t Size>
    bool CircularFifo<Element, Size>::isLockFree() const
    {
        return true; // (_tail.is_lock_free() && _head.is_lock_free());
    }

    template<typename Element, size_t Size>
    size_t CircularFifo<Element, Size>::increment(size_t idx) const
    {
        return (idx + 1) % Capacity;
    }


} // sequential_consistent
#endif /* CIRCULARFIFO_SEQUENTIAL_H_ */
